/** Writes the static share card to ../public/og.png. Run: npx ts-node scripts/make-og.ts */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_CARD, cardSvg, renderPng } from '../src/og/og.service';

const png = renderPng(cardSvg(DEFAULT_CARD));
writeFileSync(join(__dirname, '..', '..', 'public', 'og.png'), png);
console.log(`public/og.png written (${png.length} bytes)`);
