import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService, METHODOLOGY_VERSION } from './scoring.service';
import { CreateDossierDto, DecohereDto, PublishEpochDto } from './dto/editorial.dto';
import { LIST_SIZE } from '../config/siir';
import { SIGNAL, compareEntries, tierForRank } from '../config/scoring';
import { EpochsService } from '../epochs/epochs.service';
import { SeenService } from '../seen/seen.service';

const DAY = 86_400_000;

@Injectable()
export class EditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly epochs: EpochsService,
    private readonly seen: SeenService,
  ) {}

  /** Public boards are cached briefly; publishing must show up immediately. */
  private refreshPublic() {
    this.epochs.invalidate();
    this.seen.invalidate();
  }

  /** Editorial firewall: the person who nominated a mind cannot also approve it. */
  private assertNotSubmitter(influencer: { submittedBy: string }, editor: { id: string; email: string }) {
    const who = influencer.submittedBy.toLowerCase();
    if (who === editor.id.toLowerCase() || who === editor.email.toLowerCase()) {
      throw new ForbiddenException('Editorial Firewall: conflict of interest. The submitter cannot review this mind.');
    }
  }

  // 1. Create or update the "Why they're Seen" draft
  async createOrUpdateDossier(editor: { id: string; email: string }, dto: CreateDossierDto) {
    const influencer = await this.prisma.influencer.findUnique({ where: { id: dto.influencerId } });
    if (!influencer) throw new NotFoundException('Influencer not found');
    this.assertNotSubmitter(influencer, editor);

    await this.prisma.influencer.update({ where: { id: dto.influencerId }, data: { status: 'draft' } });

    if (dto.narrativeLead !== undefined) {
      await this.prisma.signalSnapshot.create({
        data: {
          influencerId: dto.influencerId,
          signalKey: SIGNAL.narrativeLead,
          value: dto.narrativeLead,
          source: 'editorial',
          methodVersion: dto.methodologyVersion,
          rawPayload: JSON.stringify({ editorId: editor.id }),
        },
      });
    }

    const existing = await this.prisma.dossier.findFirst({ where: { influencerId: dto.influencerId }, orderBy: { createdAt: 'desc' } });
    if (existing) {
      return this.prisma.dossier.update({
        where: { id: existing.id },
        data: {
          title: dto.title,
          body: dto.body,
          verdict: dto.verdict,
          aiDrafted: dto.aiDrafted ?? existing.aiDrafted,
          editorVerified: false,
          editorId: editor.id,
        },
      });
    }
    const last = await this.prisma.dossier.aggregate({ _max: { dossierNumber: true } });
    return this.prisma.dossier.create({
      data: {
        influencerId: dto.influencerId,
        dossierNumber: (last._max.dossierNumber ?? 0) + 1,
        title: dto.title,
        body: dto.body,
        verdict: dto.verdict,
        aiDrafted: dto.aiDrafted ?? true,
        methodologyVersion: dto.methodologyVersion,
        editorId: editor.id,
      },
    });
  }

  // 2. Publish: the editor verifies the text, the score is recomputed, the mind becomes eligible for an epoch
  async publishDossier(editor: { id: string; email: string }, influencerId: string) {
    const influencer = await this.prisma.influencer.findUnique({ where: { id: influencerId }, include: { identities: true } });
    if (!influencer) throw new NotFoundException('Influencer not found');
    this.assertNotSubmitter(influencer, editor);

    const dossier = await this.prisma.dossier.findFirst({ where: { influencerId }, orderBy: { createdAt: 'desc' } });
    if (!dossier) throw new BadRequestException('Draft "Why they\'re Seen" before publishing');

    if (!influencer.identities.some((i) => i.verificationTier !== 'unverified')) {
      throw new BadRequestException('At least one verified wallet is required to enter the list');
    }

    const score = await this.scoringService.calculateInfluencerScore(influencerId, dossier.methodologyVersion);
    if (score.confidence === 0) {
      throw new BadRequestException('Insufficient evidence: at least four of the five score components need data');
    }

    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'published', decoheredAt: null, decohereReason: null } });
    await this.prisma.dossier.update({ where: { id: dossier.id }, data: { editorVerified: true, publishedAt: new Date(), editorId: editor.id } });

    this.refreshPublic();
    return { success: true, message: `${influencer.name} is verified and eligible for the next epoch.` };
  }

  // 3. Publish an epoch: rank every eligible published mind, keep the top 33
  async publishEpoch(editor: { id: string; email: string }, dto: PublishEpochDto) {
    const published = await this.prisma.influencer.findMany({
      where: { status: { in: ['published', 'decohered'] } },
      include: { identities: true },
    });

    const candidates: { id: string; score: number; narrative: number; reachCount: number; c: Record<string, number> }[] = [];
    for (const inf of published) {
      if (!inf.identities.some((i) => i.verificationTier !== 'unverified')) continue;
      if (inf.status === 'decohered' && inf.decohereReason && inf.decohereReason !== 'Fell out of the top 33') continue; // removed by an editor
      const score = await this.scoringService.calculateInfluencerScore(inf.id);
      if (score.confidence === 0) continue;
      const h = JSON.parse(score.hardSignalScores);
      candidates.push({
        id: inf.id,
        score: h.finalScore,
        narrative: h.narrative,
        reachCount: h.reachCount,
        c: { reach: h.reach, engagement: h.engagement, narrative: h.narrative, onchain: h.onchain, consistency: h.consistency },
      });
    }
    if (candidates.length === 0) throw new BadRequestException('No published, rated minds are eligible yet');

    candidates.sort(compareEntries);
    const listed = candidates.slice(0, LIST_SIZE);

    const last = await this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } });
    const number = dto.number ?? (last ? last.number + 1 : 1);
    if (await this.prisma.epoch.findUnique({ where: { number } })) throw new BadRequestException(`Epoch ${number} already exists`);

    const previous = last ? await this.prisma.epochScore.findMany({ where: { epochNumber: last.number } }) : [];
    const prevRank = new Map(previous.map((p) => [p.influencerId, p.rank]));

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + (dto.durationDays ?? 7) * DAY);

    await this.prisma.$transaction([
      this.prisma.epoch.updateMany({ where: { status: 'live' }, data: { status: 'final' } }),
      this.prisma.epoch.create({ data: { number, startsAt, endsAt, status: 'live', publishedBy: editor.id, publishedAt: startsAt } }),
      this.prisma.epochScore.createMany({
        data: listed.map((row, i) => {
          const rank = i + 1;
          const before = prevRank.get(row.id);
          return {
            influencerId: row.id,
            epochNumber: number,
            score: row.score,
            reachScore: row.c.reach,
            engagement: row.c.engagement,
            narrative: row.c.narrative,
            onchain: row.c.onchain,
            consistency: row.c.consistency,
            reachCount: row.reachCount,
            rank,
            rankChange: last ? (before === undefined ? null : before - rank) : 0,
            tier: tierForRank(rank),
          };
        }),
      }),
    ]);

    // Minds that fell out are Decohered; minds that returned are Seen again.
    const listedIds = new Set(listed.map((l) => l.id));
    const dropped = candidates.filter((c) => !listedIds.has(c.id)).map((c) => c.id);
    await this.prisma.influencer.updateMany({
      where: { id: { in: [...listedIds] }, status: 'decohered' },
      data: { status: 'published', decoheredAt: null, decohereReason: null },
    });
    const wasListed = new Set(previous.map((p) => p.influencerId));
    const newlyDecohered = dropped.filter((id) => wasListed.has(id));
    if (newlyDecohered.length) {
      await this.prisma.influencer.updateMany({
        where: { id: { in: newlyDecohered } },
        data: { status: 'decohered', decoheredAt: new Date(), decohereReason: 'Fell out of the top 33' },
      });
    }

    this.refreshPublic();
    return { epoch: number, listed: listed.length, newlyDecohered: newlyDecohered.length, methodologyVersion: METHODOLOGY_VERSION };
  }

  // 4. Kill switch: an editor removes a mind from the list immediately
  async decohere(editor: { id: string; email: string }, dto: DecohereDto) {
    const influencer = await this.prisma.influencer.findUnique({ where: { id: dto.influencerId } });
    if (!influencer) throw new NotFoundException('Influencer not found');
    this.assertNotSubmitter(influencer, editor);

    await this.prisma.$transaction([
      this.prisma.influencer.update({
        where: { id: dto.influencerId },
        data: { status: 'decohered', decoheredAt: new Date(), decohereReason: dto.reason },
      }),
      this.prisma.epochScore.deleteMany({ where: { influencerId: dto.influencerId, epoch: { status: 'live' } } }),
    ]);
    this.refreshPublic();
    return { success: true, message: `${influencer.name} is Decohered and removed from the live epoch.` };
  }

  async getStats() {
    const [total, published, decohered, drafts, epochs, latest] = await Promise.all([
      this.prisma.influencer.count(),
      this.prisma.influencer.count({ where: { status: 'published' } }),
      this.prisma.influencer.count({ where: { status: 'decohered' } }),
      this.prisma.influencer.count({ where: { status: { in: ['draft', 'in_review'] } } }),
      this.prisma.epoch.count(),
      this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } }),
    ]);
    const byRealm = await this.prisma.influencer.groupBy({ by: ['realm'], _count: true, where: { status: 'published' } });
    return {
      totalInfluencers: total,
      published,
      decohered,
      awaitingEditor: drafts,
      epochs,
      latestEpoch: latest?.number ?? null,
      realms: Object.fromEntries(byRealm.map((r) => [r.realm, r._count])),
    };
  }
}
