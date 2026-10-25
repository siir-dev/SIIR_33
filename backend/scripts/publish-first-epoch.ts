/** Approves the dossiers of candidates with a verified wallet and publishes the next epoch (or EPOCH_NUMBER), using the editorial service. Run once, as the editor. */
import { PrismaClient } from '@prisma/client';
import { EditorialService } from '../src/editorial/editorial.service';
import { ScoringService } from '../src/editorial/scoring.service';

(async () => {
  const prisma = new PrismaClient();
  const email = process.env.SIIR_EDITOR_EMAIL;
  const editor = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!editor) throw new Error('Set SIIR_EDITOR_EMAIL to an existing editor');
  const noop = { invalidate() {} };
  const svc = new EditorialService(prisma as never, new ScoringService(prisma as never), noop as never, noop as never);

  const eligible = await prisma.influencer.findMany({
    where: { submittedBy: 'editorial-import', status: { in: ['draft', 'published'] }, dossiers: { some: {} }, identities: { some: { verificationTier: { not: 'unverified' } } } },
    select: { id: true, handle: true },
  });
  console.log(`${eligible.length} eligible`);
  for (const i of eligible) {
    try {
      await svc.publishDossier({ id: editor.id, email: editor.email }, i.id);
      console.log(`approved @${i.handle}`);
    } catch (e) {
      console.warn(`skipped @${i.handle}: ${(e as Error).message}`);
    }
  }
  const res = await svc.publishEpoch({ id: editor.id, email: editor.email }, (process.env.EPOCH_NUMBER ? { number: Number(process.env.EPOCH_NUMBER) } : {}) as never);
  console.log(JSON.stringify(res));
  console.log(JSON.stringify({
    epoch: await prisma.epoch.count(), epochScore: await prisma.epochScore.count(), published: await prisma.influencer.count({ where: { status: 'published' } }),
    dossierVerified: await prisma.dossier.count({ where: { editorVerified: true } }), score: await prisma.score.count(),
  }));
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
