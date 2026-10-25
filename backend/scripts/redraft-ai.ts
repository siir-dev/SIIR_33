/** Redrafts every rated candidate's "Why they're Seen" with the configured AI provider. Drafts stay unverified until an editor approves. */
import { PrismaClient } from '@prisma/client';
import { DossierAiService } from '../src/editorial/dossier-ai.service';
import { METHODOLOGY_VERSION } from '../src/editorial/scoring.service';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ override: true });
} catch {
  /* Prisma loads .env on its own */
}

(async () => {
  const prisma = new PrismaClient();
  const ai = new DossierAiService(prisma as never);
  const infs = await prisma.influencer.findMany({ where: { submittedBy: 'editorial-import' }, orderBy: { handle: 'asc' }, include: { dossiers: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  let done = 0;
  let failed = 0;
  for (const inf of infs) {
    const d = inf.dossiers[0];
    if (!d) continue; // unrated minds have no dossier
    try {
      const body = (await ai.generateAiDossier(inf.id)).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\s+/g, ' ').replace(/^why they.re seen:?\s*/i, '').trim();
      if (!body || body.length > 600) throw new Error(`unusable draft (${body.length} chars)`);
      await prisma.dossier.update({ where: { id: d.id }, data: { body, aiDrafted: true, editorVerified: false, publishedAt: null, methodologyVersion: METHODOLOGY_VERSION } });
      done++;
      console.log(`@${inf.handle}: ${body}`);
    } catch (e) {
      failed++;
      console.warn(`@${inf.handle}: kept old text (${(e as Error).message})`);
    }
  }
  console.log(JSON.stringify({ done, failed }));
  await prisma.$disconnect();
})();
