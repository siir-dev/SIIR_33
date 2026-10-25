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
/** The bundled fonts cover Latin only; anything else would render as empty boxes. */
const latin = (s: string, fallback: string) => s.replace(/[^ -ɏ‐-‧]/g, '').replace(/\s+/g, ' ').trim() || fallback;

export interface OgCard {
  eyebrow: string;
  title: string; // big serif line
  lines?: string[]; // generic card: the headline broken over several lines
  rank?: number;
  handle?: string;
  tier?: string;
  score?: number;
  realm?: string;
  avatarData?: string; // data: URI of the mind's photo
  bars?: [string, number][]; // component label and 0-100 value
}

/** Brand colours as used by tokens.css, plus the night side of the palette for the share card. */
const C = { night: '#061226', navy: '#0B1F3A', ink: '#0B1B2D', slate: '#8FA3BB', sky: '#2D86F0', skyLight: '#7DB8FF', azure: '#1B5FB8', paper: '#FFFFFF' };

export const DEFAULT_CARD: OgCard = {
  eyebrow: 'The SIIR 33',
  title: "The minds the market hasn't seen yet.",
  lines: ['The minds', 'the market', "hasn't seen yet."],
};

/** Background shared by every card: night gradient, grid, orbit rings, light streak, corner brackets. */
function backdrop(): string {
  const grid = Array.from({ length: 31 }, (_, i) => `<path d="M${i * 40} 0V630"/>`).join('') + Array.from({ length: 16 }, (_, i) => `<path d="M0 ${i * 40}H1200"/>`).join('');
  return `<defs>
    <radialGradient id="bg" cx="78%" cy="40%" r="85%">
      <stop offset="0" stop-color="#16407A"/>
      <stop offset="0.45" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="${C.night}"/>
    </radialGradient>
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.skyLight}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${C.skyLight}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${C.skyLight}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="arc" gradientUnits="userSpaceOnUse" x1="820" y1="180" x2="1080" y2="460">
      <stop offset="0" stop-color="${C.skyLight}"/>
      <stop offset="1" stop-color="${C.sky}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.azure}"/>
      <stop offset="1" stop-color="${C.skyLight}"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g fill="none" stroke="${C.skyLight}" stroke-opacity=".07" stroke-width="1">${grid}</g>
  <polygon points="700,0 860,0 420,630 260,630" fill="url(#streak)"/>
  <g fill="none" stroke="${C.skyLight}" stroke-width="2">
    <circle cx="950" cy="315" r="200" stroke-opacity=".30"/>
    <circle cx="950" cy="315" r="285" stroke-opacity=".18" stroke-dasharray="3 9"/>
    <circle cx="950" cy="315" r="385" stroke-opacity=".12"/>
  </g>
  <g fill="none" stroke="${C.skyLight}" stroke-width="3" stroke-linecap="round" stroke-opacity=".85">
    <path d="M28 70V28H70"/><path d="M1130 28H1172V70"/><path d="M28 560V602H70"/><path d="M1172 560V602H1130"/>
  </g>`;
}

function chip(x: number, y: number, text: string, filled: boolean): { svg: string; w: number } {
  const w = Math.round(text.length * 12.6 + 34);
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="38" rx="19" fill="${filled ? C.sky : 'none'}" fill-opacity="${filled ? 0.95 : 0}" stroke="${C.skyLight}" stroke-opacity="${filled ? 0 : 0.6}" stroke-width="1.6"/>
  <text x="${x + w / 2}" y="${y + 25.5}" text-anchor="middle" font-family="Inter" font-size="17" font-weight="600" letter-spacing="1.4" fill="${C.paper}">${esc(text.toUpperCase())}</text>`,
  };
}

export function cardSvg(c: OgCard): string {
  const logoPill = `<rect x="64" y="46" width="176" height="56" rx="28" fill="${C.paper}" fill-opacity=".94"/>
  <image href="${LOGO}" x="82" y="56" width="140" height="43" preserveAspectRatio="xMidYMid meet"/>`;
  const footer = `<text x="92" y="598" font-family="Inter" font-size="19" letter-spacing="1" fill="${C.slate}">Super Intelligence Influencer Rank · Solana and Robinhood Chain</text>`;

  if (c.rank === undefined) {
    const lines = (c.lines ?? [c.title])
      .map((line, i) => `<text x="72" y="${300 + i * 104}" font-family="Playfair Display" font-size="96" fill="${i === 2 ? C.skyLight : C.paper}">${esc(line)}</text>`)
      .join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${backdrop()}
  ${logoPill}
  <text x="72" y="170" font-family="Inter" font-size="22" font-weight="600" letter-spacing="5" fill="${C.skyLight}">${esc(c.eyebrow.toUpperCase())}</text>
  ${lines}
  ${footer}
</svg>`;
  }

  // Mind card
  const name = latin(c.title, `@${c.handle ?? ''}`);
  const score = Math.max(0, Math.min(100, c.score ?? 0));
  const CIRC = 2 * Math.PI * 128;
  const arc = (score / 100) * CIRC;
  const initials = latin(c.title, '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const avatar = c.avatarData
    ? `<image href="${c.avatarData}" x="75" y="215" width="210" height="210" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="180" cy="320" r="105" fill="${C.azure}"/><text x="180" y="342" text-anchor="middle" font-family="Playfair Display" font-size="72" fill="${C.paper}">${esc(initials)}</text>`;
  const tier = chip(330, 372, c.tier ?? '', true);
  const realm = chip(330 + tier.w + 12, 372, c.realm ?? '', false);
  const bars = (c.bars ?? [])
    .map(([label, v], i) => {
      const y = 452 + i * 27;
      const w = Math.max(4, (Math.min(100, v) / 100) * 330);
      return `<text x="330" y="${y + 11}" font-family="Inter" font-size="14" font-weight="600" letter-spacing="2" fill="${C.slate}">${esc(label.toUpperCase())}</text>
  <rect x="520" y="${y}" width="330" height="9" rx="4.5" fill="${C.paper}" fill-opacity=".1"/>
  <rect x="520" y="${y}" width="${w.toFixed(1)}" height="9" rx="4.5" fill="url(#bar)"/>
  <text x="868" y="${y + 10}" font-family="Inter" font-size="14" font-weight="600" fill="${C.paper}" fill-opacity=".85">${Math.round(v)}</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${backdrop()}
  <defs><clipPath id="av"><circle cx="180" cy="320" r="105"/></clipPath></defs>
  <text x="1160" y="560" text-anchor="end" font-family="Playfair Display" font-size="330" fill="none" stroke="${C.skyLight}" stroke-opacity=".16" stroke-width="3">${c.rank}</text>
  ${logoPill}
  <text x="1128" y="82" text-anchor="end" font-family="Inter" font-size="19" font-weight="600" letter-spacing="4" fill="${C.skyLight}">${esc(c.eyebrow.toUpperCase())}</text>

  <circle cx="180" cy="320" r="128" fill="${C.sky}" fill-opacity=".55" filter="url(#soft)"/>
  <circle cx="180" cy="320" r="122" fill="none" stroke="${C.skyLight}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="2 8"/>
  ${avatar}
  <circle cx="180" cy="320" r="108" fill="none" stroke="${C.skyLight}" stroke-width="5"/>
  <circle cx="258" cy="398" r="40" fill="${C.sky}" stroke="${C.paper}" stroke-width="4"/>
  <text x="258" y="412" text-anchor="middle" font-family="Playfair Display" font-size="38" font-weight="700" fill="${C.paper}">#${c.rank}</text>

  <text x="330" y="262" font-family="Playfair Display" font-size="${name.length > 14 ? 58 : 72}" fill="${C.paper}">${esc(clip(name, 20))}</text>
  <text x="332" y="318" font-family="Inter" font-size="26" fill="${C.skyLight}">@${esc(clip(c.handle ?? '', 28))}</text>
  ${tier.svg}
  ${realm.svg}
  ${bars}

  <circle cx="950" cy="315" r="128" fill="none" stroke="${C.sky}" stroke-opacity=".35" stroke-width="22" filter="url(#glow)"/>
  <circle cx="950" cy="315" r="128" fill="none" stroke="${C.paper}" stroke-opacity=".1" stroke-width="16"/>
  <circle cx="950" cy="315" r="128" fill="none" stroke="url(#arc)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${arc.toFixed(1)} ${CIRC.toFixed(1)}" transform="rotate(-90 950 315)"/>
  <text x="950" y="338" text-anchor="middle" font-family="Playfair Display" font-size="92" fill="${C.paper}">${score.toFixed(1)}</text>
  <text x="950" y="378" text-anchor="middle" font-family="Inter" font-size="17" font-weight="600" letter-spacing="5" fill="${C.skyLight}">SIIR SCORE</text>
  ${footer}
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

/** The mind's X photo as a data URI, or undefined when it cannot be fetched quickly. */
async function fetchAvatar(url: string | null): Promise<string | undefined> {
  if (!url || !/^https:\/\/pbs\.twimg\.com\//.test(url)) return undefined;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return undefined;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return undefined;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return undefined;
  }
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

    const key = entry ? `v2:${handle}:${epoch!.number}:${entry.rank}:${entry.score}:${entry.influencer.avatarUrl ?? ''}` : 'v2:default';
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
          avatarData: await fetchAvatar(entry.influencer.avatarUrl),
          bars: [
            ['Reach', entry.reachScore],
            ['Engagement', entry.engagement],
            ['Narrative', entry.narrative],
            ['On-chain', entry.onchain],
            ['Consistency', entry.consistency],
          ],
        })
      : cardSvg(DEFAULT_CARD);
    const png = renderPng(svg);

    if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, png);
    return png;
  }
}
