import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TtlCache } from '../common/ttl-cache';

const SPARK_EPOCHS = 8;

@Injectable()
export class EpochsService {
  private readonly cache = new TtlCache<unknown>(20_000);

  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.cache.wrap('list', () => this.loadList()) as ReturnType<EpochsService['loadList']>;
  }

  findOne(ref: string) {
    return this.cache.wrap(`epoch:${ref}`, () => this.loadOne(ref)) as ReturnType<EpochsService['loadOne']>;
  }

  /** Drop cached boards right after an editor publishes. */
  invalidate() {
    this.cache.clear();
  }

  private async loadList() {
    const epochs = await this.prisma.epoch.findMany({ orderBy: { number: 'desc' } });
    // One query for every epoch's Singular instead of one query per epoch.
    const tops = await this.prisma.epochScore.findMany({
      where: { rank: 1, epochNumber: { in: epochs.map((e) => e.number) } },
      include: { influencer: true },
    });
    const byEpoch = new Map(tops.map((t) => [t.epochNumber, t]));
    return epochs.map((e) => {
      const top = byEpoch.get(e.number);
      return {
        number: e.number,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: e.status,
        singular: top ? { handle: top.influencer.handle, name: top.influencer.name, avatarUrl: top.influencer.avatarUrl, score: top.score } : null,
      };
    });
  }

  private async loadOne(ref: string) {
    const epoch =
      ref === 'current'
        ? await this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } })
        : await this.prisma.epoch.findUnique({ where: { number: Number(ref) || -1 } });
    if (!epoch) throw new NotFoundException('Epoch not found');

    const rows = await this.prisma.epochScore.findMany({
      relationLoadStrategy: 'join', // one round trip instead of one per relation
      where: { epochNumber: epoch.number },
      orderBy: { rank: 'asc' },
      include: { influencer: { include: { dossiers: { where: { editorVerified: true }, orderBy: { publishedAt: 'desc' }, take: 1 } } } },
    });
    const history = await this.prisma.epochScore.findMany({
      where: {
        influencerId: { in: rows.map((r) => r.influencerId) },
        epochNumber: { lte: epoch.number, gt: epoch.number - SPARK_EPOCHS },
      },
      orderBy: { epochNumber: 'asc' },
      select: { influencerId: true, score: true },
    });
    const spark = new Map<string, number[]>();
    for (const h of history) spark.set(h.influencerId, [...(spark.get(h.influencerId) ?? []), h.score]);

    return {
      epoch,
      entries: rows.map((r) => ({
        rank: r.rank,
        rankChange: r.rankChange,
        isNew: r.rankChange === null,
        tier: r.tier,
        score: r.score,
        reach: r.reachCount,
        spark: spark.get(r.influencerId) ?? [],
        influencer: {
          handle: r.influencer.handle,
          name: r.influencer.name,
          bio: r.influencer.bio,
          why: r.influencer.dossiers[0]?.body ?? '',
          realm: r.influencer.realm,
          avatarUrl: r.influencer.avatarUrl,
        },
      })),
    };
  }
}
