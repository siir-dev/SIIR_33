/** Writes data/x-avatars.json (handle -> X profile image URL) into Influencer.avatarUrl. Run: npx ts-node scripts/set-avatars.ts */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

(async () => {
  const map: Record<string, string> = JSON.parse(readFileSync(join(__dirname, '..', '..', 'data', 'x-avatars.json'), 'utf8'));
  const prisma = new PrismaClient();
  let n = 0;
  for (const [handle, url] of Object.entries(map)) {
    const r = await prisma.influencer.updateMany({ where: { handle }, data: { avatarUrl: url } });
    if (r.count === 0) console.warn(`No influencer for @${handle}`);
    n += r.count;
  }
  console.log(`Updated ${n} of ${Object.keys(map).length}`);
  await prisma.$disconnect();
})();
