import { Injectable } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TIERS } from '../config/siir';

const FONTS = [join(process.cwd(), 'assets', 'fonts', 'PlayfairDisplay.ttf'), join(process.cwd(), 'assets', 'fonts', 'Inter.ttf')];
const LOGO = `data:image/png;base64,${readFileSync(join(process.cwd(), 'assets', 'logo.png')).toString('base64')}`;
const REALM = { velocity: 'Solana', ledger: 'Robinhood Chain', bridged: 'Solana + Robinhood Chain' } as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** Keeps long names inside the card. */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export interface OgCard {
  eyebrow: string;
  title: string; // big serif line
  lines?: string[]; // generic card: the headline broken over several lines
  rank?: number;
  handle?: string;
  tier?: string;
  score?: number;
  realm?: string;
}

/** Brand colours as used by tokens.css. */
const C = { navy: '#0B1F3A', ink: '#0B1B2D', slate: '#5A6B80', sky: '#2D86F0', azure: '#1B5FB8', paper: '#FFFFFF' };

export const DEFAULT_CARD: OgCard = {
  eyebrow: 'The SIIR 33',
  title: "The minds the market hasn't seen yet.",
  lines: ['The minds', 'the market', "hasn't seen yet."],
};

export function cardSvg(c: OgCard): string {
  const hasRank = c.rank !== undefined;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFDCFB"/>
      <stop offset="1" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#sky)"/>
  <g fill="none" stroke="${C.sky}" stroke-opacity=".28" stroke-width="2">
    <circle cx="1000" cy="330" r="150"/><circle cx="1000" cy="330" r="250"/><circle cx="1000" cy="330" r="360"/>
  </g>
  <image href="${LOGO}" x="72" y="52" width="190" height="58"/>
  <text x="72" y="160" font-family="Inter" font-size="22" font-weight="600" letter-spacing="4" fill="${C.azure}">${esc(c.eyebrow.toUpperCase())}</text>
  ${
    hasRank
      ? `<text x="72" y="400" font-family="Playfair Display" font-size="290" fill="${C.sky}">#${c.rank}</text>
  <text x="640" y="310" font-family="Playfair Display" font-size="68" fill="${C.ink}">${esc(clip(c.title, 18))}</text>
  <text x="640" y="362" font-family="Inter" font-size="28" fill="${C.slate}">@${esc(c.handle ?? '')}</text>
  <text x="640" y="418" font-family="Inter" font-size="26" fill="${C.azure}">${esc([c.tier, c.realm].filter(Boolean).join('  ·  '))}</text>
  <text x="640" y="474" font-family="Inter" font-size="20" font-weight="600" letter-spacing="3" fill="${C.slate}">SIIR SCORE</text>
  <text x="640" y="548" font-family="Playfair Display" font-size="88" fill="${C.ink}">${c.score?.toFixed(1) ?? ''}</text>`
      : (c.lines ?? [c.title])
          .map((line, i) => `<text x="72" y="${290 + i * 104}" font-family="Playfair Display" font-size="96" fill="${i === 2 ? C.azure : C.ink}">${esc(line)}</text>`)
          .join(' ')
  }
  <text x="72" y="600" font-family="Inter" font-size="22" fill="${C.slate}">Super Intelligence Influencer Rank · Solana and Robinhood Chain</text>
</svg>`;
}

export function renderPng(svg: string): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
}

@Injectable()
export class OgService {
  private cache = new Map<string, Buffer>();

  constructor(private readonly prisma: PrismaService) {}

  /** PNG for a mind in the latest epoch, or the generic card when the handle is unknown or not listed. */
  async forHandle(handle: string): Promise<Buffer> {
    const epoch = await this.prisma.epoch.findFirst({ orderBy: { number: 'desc' } });
    const entry = epoch
      ? await this.prisma.epochScore.findFirst({
          where: { epochNumber: epoch.number, influencer: { handle } },
          include: { influencer: true },
        })
      : null;

    const key = entry ? `${handle}:${epoch!.number}:${entry.rank}:${entry.score}` : 'default';
    const hit = this.cache.get(key);
    if (hit) return hit;

    const tierLabel = entry ? (TIERS.find((t) => t.key === entry.tier)?.label ?? '') : '';
    const svg = entry
      ? cardSvg({
          eyebrow: `The SIIR 33 · Epoch ${epoch!.number}`,
          title: entry.influencer.name,
          rank: entry.rank,
          handle: entry.influencer.handle,
          tier: tierLabel,
          score: entry.score,
          realm: REALM[entry.influencer.realm as keyof typeof REALM],
        })
      : cardSvg(DEFAULT_CARD);
    const png = renderPng(svg);

    if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, png);
    return png;
  }
}
