/**
 * Clears everything derived from the readings (epochs, rankings, scores, dossiers), puts the candidates back to
 * `submitted`, then redrafts each "Why they're Seen" with the AI service and rescores. Raw readings are kept.
 *   npx ts-node scripts/redo-dossiers.ts
 */
import { PrismaClient } from '@prisma/client';
import { DossierAiService } from '../src/editorial/dossier-ai.service';
import { ScoringService, METHODOLOGY_VERSION } from '../src/editorial/scoring.service';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  /* Prisma loads .env on its own */
}

(async () => {
  const prisma = new PrismaClient();
  const before = { epoch: await prisma.epoch.count(), epochScore: await prisma.epochScore.count(), score: await prisma.score.count(), dossier: await prisma.dossier.count() };
  console.log('before', JSON.stringify(before));

  await prisma.$transaction([
    prisma.epochScore.deleteMany({}),
    prisma.epoch.deleteMany({}),
    prisma.score.deleteMany({}),
    prisma.dossier.deleteMany({}),
    prisma.influencer.updateMany({ where: { submittedBy: 'editorial-import' }, data: { status: 'submitted', decoheredAt: null, decohereReason: null } }),
  ]);
  console.log('cleared');

  const ai = new DossierAiService(prisma as never);
  const scoring = new ScoringService(prisma as never);
  const infs = await prisma.influencer.findMany({ where: { submittedBy: 'editorial-import' }, orderBy: { handle: 'asc' } });
  let n = 0;
  let failed = 0;
  for (const inf of infs) {
    const score = await scoring.calculateInfluencerScore(inf.id);
    if (score.confidence === 0) {
      console.log(`@${inf.handle}: not enough evidence, no dossier`);
      continue;
    }
    try {
      const body = (await ai.generateAiDossier(inf.id)).replace(/\s+/g, ' ').trim();
      n += 1;
      await prisma.dossier.create({
        data: {
          influencerId: inf.id,
          dossierNumber: n,
          title: `Why ${inf.name} is Seen`,
          body,
          verdict: 'Rated on reach, engagement and on-chain footprint. Narrative lead not yet judged.',
          aiDrafted: true,
          editorVerified: false,
          methodologyVersion: METHODOLOGY_VERSION,
        },
      });
      await prisma.influencer.update({ where: { id: inf.id }, data: { status: 'draft' } });
      console.log(`@${inf.handle}: ${body}`);
    } catch (e) {
      failed += 1;
      console.warn(`@${inf.handle}: AI draft failed (${(e as Error).message})`);
    }
  }
  console.log(JSON.stringify({ dossiers: n, failed, scores: await prisma.score.count(), epochs: await prisma.epoch.count() }));
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
