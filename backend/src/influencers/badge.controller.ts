import { Controller, Get, Header, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TIERS } from '../config/siir';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Live SVG badge: rank, tier and score of a mind in the latest epoch. Embeddable anywhere. */
@Controller('badge')
export class BadgeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':handle')
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async badge(@Param('handle') raw: string) {
    const handle = raw.replace(/\.svg$/i, '').replace(/^@/, '').toLowerCase();
    const epoch = await this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } });
    const entry = epoch
      ? await this.prisma.epochScore.findFirst({
          where: { epochNumber: epoch.number, influencer: { handle } },
          include: { influencer: true },
        })
      : null;

    const tier = entry ? (TIERS.find((t) => t.key === entry.tier)?.label ?? entry.tier) : '';
    const title = entry ? `${entry.influencer.name}, #${entry.rank} ${tier}, SIIR Score ${entry.score.toFixed(1)}` : `@${handle} is not on The SIIR 33`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="64" viewBox="0 0 260 64" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <rect width="260" height="64" rx="12" fill="#FFFFFF" stroke="#D5DEEA"/>
  <rect x="0" y="0" width="64" height="64" rx="12" fill="#0B1F3A"/>
  <text x="32" y="30" text-anchor="middle" font-family="Georgia, serif" font-size="${entry ? 26 : 18}" fill="#8CC0FA">${entry ? `#${entry.rank}` : '-'}</text>
  <text x="32" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" letter-spacing="1.5" fill="#FFFFFF">SIIR 33</text>
  <text x="76" y="28" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#0B1B2D">${esc(entry ? entry.influencer.name.slice(0, 22) : `@${handle}`.slice(0, 22))}</text>
  <text x="76" y="46" font-family="Arial, sans-serif" font-size="11" fill="#5A6B80">${entry ? `${esc(tier)} · ${entry.score.toFixed(1)}` : 'Not listed this epoch'}</text>
</svg>`;
  }
}
