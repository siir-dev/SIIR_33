/**
 * Drafts "Why they're Seen" from the stored readings only (no AI provider needed). Quotes followers, interactions per post,
 * chain activity and trade count; never profit or win rate. Marked as AI-drafted and unverified until an editor approves.
 *   npx ts-node scripts/draft-dossiers.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { METHODOLOGY_VERSION, ScoringService } from '../src/editorial/scoring.service';
import { SIGNAL } from '../src/config/scoring';

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : n >= 1e4 ? `${Math.round(n / 1e3)} thousand` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} thousand` : String(Math.round(n)));
const num = (n: number) => Math.round(n).toLocaleString('en-US');

(async () => {
  const prisma = new PrismaClient();
  const scoring = new ScoringService(prisma as never);
  const metrics: Record<string, { followers: number; avgInteractions: number; sample: number }> = JSON.parse(readFileSync(join(__dirname, '..', '..', 'data', 'x-metrics.json'), 'utf8'));
  const infs = await prisma.influencer.findMany({ where: { submittedBy: 'editorial-import' }, orderBy: { handle: 'asc' }, include: { snapshots: { orderBy: { collectedAt: 'desc' } } } });
  let n = (await prisma.dossier.aggregate({ _max: { dossierNumber: true } }))._max.dossierNumber ?? 0;
  for (const inf of infs) {
    const score = await prisma.score.findFirst({ where: { influencerId: inf.id }, orderBy: { computedAt: 'desc' } });
    if (!score || score.confidence === 0) continue;
    const latest = (key: string) => inf.snapshots.find((s) => s.signalKey === key)?.value;
    const m = metrics[inf.handle];
    const chain = inf.chains.split(',')[0] === 'robinhood' ? 'Robinhood Chain' : 'Solana';
    const trades = latest(SIGNAL.trades30d);
    const total = latest(SIGNAL.txCountTotal);
    const audience = `${inf.name} reaches ${fmt(m.followers)} followers on X, and recent posts draw about ${num(m.avgInteractions)} interactions each.`;
    const onchain =
      total !== undefined && trades !== undefined
        ? `On ${chain} the wallet has sent ${num(total)} transactions and made ${num(trades)} trades in the last 30 days.`
        : trades !== undefined
          ? `On ${chain} the wallet made ${num(trades)} trades in the last 30 days.`
          : `The ${chain} wallet is active.`;
    n += 1;
    await prisma.dossier.create({
      data: {
        influencerId: inf.id,
        dossierNumber: n,
        title: `Why ${inf.name} is Seen`,
        body: `${audience} ${onchain} Narrative lead is not rated yet.`,
        verdict: 'Rated on reach, engagement and on-chain footprint. Narrative lead not yet judged.',
        aiDrafted: true,
        editorVerified: false,
        methodologyVersion: METHODOLOGY_VERSION,
      },
    });
    await prisma.influencer.update({ where: { id: inf.id }, data: { status: 'draft' } });
  }
  console.log(JSON.stringify({ dossiers: await prisma.dossier.count(), drafts: await prisma.influencer.count({ where: { status: 'draft' } }) }));
  const sample = await prisma.dossier.findMany({ take: 3, orderBy: { dossierNumber: 'asc' }, select: { body: true } });
  sample.forEach((s) => console.log('-', s.body));
  await prisma.$disconnect();
})();
