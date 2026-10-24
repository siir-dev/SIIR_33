import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TtlCache } from '../common/ttl-cache';

@Injectable()
export class SeenService {
  private readonly cache = new TtlCache<unknown>(20_000);

  constructor(private readonly prisma: PrismaService) {}

  findByHandle(handle: string) {
    return this.cache.wrap(handle.replace(/^@/, '').toLowerCase(), () => this.load(handle)) as ReturnType<SeenService['load']>;
  }

  invalidate() {
    this.cache.clear();
  }

  private async load(handle: string) {
    // Every round trip to the hosted database costs real time, so independent queries run together.
    const [influencer, latestEpoch] = await Promise.all([
      this.prisma.influencer.findUnique({
        relationLoadStrategy: 'join', // one round trip for the whole profile
        where: { handle: handle.replace(/^@/, '').toLowerCase() },
        include: {
          epochScores: { orderBy: { epochNumber: 'asc' } },
          signals: { orderBy: { postedAt: 'desc' }, take: 6 },
          dossiers: { where: { editorVerified: true }, orderBy: { publishedAt: 'desc' }, take: 1 },
          identities: true,
        },
      }),
      this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } }),
    ]);
    if (!influencer) throw new NotFoundException('Profile not found');

    const current = influencer.epochScores.find((s) => s.epochNumber === latestEpoch?.number) ?? null;
    const last = influencer.epochScores[influencer.epochScores.length - 1] ?? null;
    const shown = current ?? last;

    // Four related minds: same realm first, topped up with the best of the rest.
    const [sameRealm, others] = await Promise.all([
      this.prisma.epochScore.findMany({
        where: { epochNumber: latestEpoch?.number, influencerId: { not: influencer.id }, influencer: { realm: influencer.realm } },
        orderBy: { rank: 'asc' },
        take: 4,
        include: { influencer: true },
      }),
      this.prisma.epochScore.findMany({
        where: { epochNumber: latestEpoch?.number, influencerId: { not: influencer.id } },
        orderBy: { rank: 'asc' },
        take: 8,
        include: { influencer: true },
      }),
    ]);
    const also = sameRealm;
    const fill = others.filter((o) => !sameRealm.some((s) => s.influencerId === o.influencerId)).slice(0, Math.max(0, 4 - sameRealm.length));

    return {
      influencer: {
        handle: influencer.handle,
        name: influencer.name,
        bio: influencer.bio,
        why: influencer.dossiers[0]?.body ?? '',
        realm: influencer.realm,
        wallets: influencer.identities.filter((i) => i.verificationTier !== 'unverified').length,
      },
      previouslySeen: !current || influencer.status === 'decohered',
      current: shown && {
        epoch: shown.epochNumber,
        rank: shown.rank,
        rankChange: shown.rankChange,
        tier: shown.tier,
        score: shown.score,
        reach: shown.reachCount,
        components: {
          reach: shown.reachScore,
          engagement: shown.engagement,
          narrative: shown.narrative,
          onchain: shown.onchain,
          consistency: shown.consistency,
        },
      },
      stats: {
        peakRank: influencer.epochScores.length ? Math.min(...influencer.epochScores.map((s) => s.rank)) : null,
        firstEpoch: influencer.epochScores[0]?.epochNumber ?? null,
        epochsListed: influencer.epochScores.length,
      },
      history: influencer.epochScores.map((s) => ({ epoch: s.epochNumber, score: s.score, rank: s.rank })),
      signals: influencer.signals,
      also: [...also, ...fill].map((a) => ({
        handle: a.influencer.handle,
        name: a.influencer.name,
        realm: a.influencer.realm,
        rank: a.rank,
        tier: a.tier,
        score: a.score,
      })),
    };
  }
}
