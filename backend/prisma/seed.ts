import { randomUUID } from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import * as dotenv from 'dotenv';
import { LIST_SIZE, THRESHOLDS } from '../src/config/siir';
import { SIGNAL, compareEntries, computeScore, deriveComponents, tierForRank, Components } from '../src/config/scoring';
import { realmFromChains } from '../src/config/explorer-registry';
dotenv.config();

const prisma = new PrismaClient();

/**
 * PREVIEW DATA. Every mind below is fictional. Wallet addresses are random strings in the right format.
 * Replace with real nominations flowing through the pipeline before launch.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (n: number, lo = 0.05, hi = 0.99) => Math.min(hi, Math.max(lo, n));

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const solAddress = (r: () => number) => Array.from({ length: 44 }, () => B58[Math.floor(r() * B58.length)]).join('');
const evmAddress = (r: () => number) => '0x' + Array.from({ length: 40 }, () => Math.floor(r() * 16).toString(16)).join('');

type Seed = { handle: string; name: string; realm: 'velocity' | 'ledger' | 'bridged'; focus: string };

const PEOPLE: Seed[] = [
  { handle: 'maravoss', name: 'Mara Voss', realm: 'bridged', focus: 'cross-chain liquidity narratives' },
  { handle: 'kiranolsen', name: 'Kiran Olsen', realm: 'velocity', focus: 'Solana memecoin microstructure' },
  { handle: 'theoquill', name: 'Theo Quill', realm: 'ledger', focus: 'tokenised equities and settlement rails' },
  { handle: 'ilsewren', name: 'Ilse Wren', realm: 'bridged', focus: 'on-chain brokerage flows' },
  { handle: 'dariusvane', name: 'Darius Vane', realm: 'velocity', focus: 'validator economics and MEV' },
  { handle: 'noorhalden', name: 'Noor Halden', realm: 'ledger', focus: 'regulated asset issuance' },
  { handle: 'ostapreyes', name: 'Ostap Reyes', realm: 'velocity', focus: 'agent-driven trading desks' },
  { handle: 'sunnivalark', name: 'Sunniva Lark', realm: 'bridged', focus: 'stablecoin routing' },
  { handle: 'emeryfold', name: 'Emery Fold', realm: 'ledger', focus: 'custody and compliance tooling' },
  { handle: 'jasperlin', name: 'Jasper Lin', realm: 'velocity', focus: 'DEX aggregation and liquidity pools' },
  { handle: 'bryonyash', name: 'Bryony Ash', realm: 'bridged', focus: 'tokenised treasuries' },
  { handle: 'caspianroe', name: 'Caspian Roe', realm: 'velocity', focus: 'launchpad cycles' },
  { handle: 'liviathorne', name: 'Livia Thorne', realm: 'ledger', focus: 'broker-dealer migration on-chain' },
  { handle: 'yusufmarlow', name: 'Yusuf Marlow', realm: 'velocity', focus: 'perpetuals and funding rates' },
  { handle: 'annikasol', name: 'Annika Sol', realm: 'bridged', focus: 'cross-realm market structure' },
  { handle: 'rexfenwick', name: 'Rex Fenwick', realm: 'velocity', focus: 'restaking and yield' },
  { handle: 'odettemoss', name: 'Odette Moss', realm: 'ledger', focus: 'institutional on-ramps' },
  { handle: 'tavishgrey', name: 'Tavish Grey', realm: 'velocity', focus: 'wallet cohort analytics' },
  { handle: 'saoirsevale', name: 'Saoirse Vale', realm: 'bridged', focus: 'RWA collateral' },
  { handle: 'milosbrandt', name: 'Milos Brandt', realm: 'ledger', focus: 'exchange-traded token wrappers' },
  { handle: 'zaracobb', name: 'Zara Cobb', realm: 'velocity', focus: 'creator coins and social tokens' },
  { handle: 'finnegannox', name: 'Finnegan Nox', realm: 'velocity', focus: 'bot detection and wash trading' },
  { handle: 'imanibright', name: 'Imani Bright', realm: 'ledger', focus: 'retail access to private markets' },
  { handle: 'leorivet', name: 'Leo Rivet', realm: 'bridged', focus: 'bridging risk and settlement' },
  { handle: 'petrawilde', name: 'Petra Wilde', realm: 'velocity', focus: 'AI agent token launches' },
  { handle: 'hugodelacroix', name: 'Hugo Delacroix', realm: 'ledger', focus: 'market-maker incentives' },
  { handle: 'wrenakagi', name: 'Wren Akagi', realm: 'velocity', focus: 'priority fees and block space' },
  { handle: 'celesteroan', name: 'Celeste Roan', realm: 'bridged', focus: 'liquidity migration between chains' },
  { handle: 'ansgarfell', name: 'Ansgar Fell', realm: 'ledger', focus: 'tokenised fund shares' },
  { handle: 'ninavolk', name: 'Nina Volk', realm: 'velocity', focus: 'airdrop meta' },
  { handle: 'quincyharte', name: 'Quincy Harte', realm: 'velocity', focus: 'liquid staking' },
  { handle: 'esmebarlow', name: 'Esme Barlow', realm: 'ledger', focus: 'order-book design' },
  { handle: 'tomasmirez', name: 'Tomas Mirez', realm: 'bridged', focus: 'derivatives across chains' },
  { handle: 'verawinter', name: 'Vera Winter', realm: 'velocity', focus: 'governance and treasuries' },
  { handle: 'abelhorne', name: 'Abel Horne', realm: 'ledger', focus: 'settlement finality research' },
  { handle: 'rhiannonpike', name: 'Rhiannon Pike', realm: 'velocity', focus: 'NFT liquidity revival' },
];

const REALM_LABEL = { velocity: 'Solana', ledger: 'Robinhood Chain', bridged: 'both Solana and Robinhood Chain' } as const;

function why(p: Seed, r: () => number): string {
  const openers = [
    `Writes about ${p.focus} before the timeline does.`,
    `Has covered ${p.focus} since the early signs.`,
    `Reads ${p.focus} earlier than most of the feed.`,
  ];
  const middles = [
    `Threads here are quoted by desks that move size on ${REALM_LABEL[p.realm]}.`,
    `Their calls on ${REALM_LABEL[p.realm]} tend to land two to three days ahead of the crowd.`,
    `The audience on ${REALM_LABEL[p.realm]} treats each post as a leading indicator.`,
  ];
  const closers = [
    'Seer logs a steady climb in verified wallet activity.',
    'Engagement stays clean after bot filtering.',
    'Narrative lead holds across the last eight epochs.',
  ];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return `${pick(openers)} ${pick(middles)} ${pick(closers)}`;
}

const SIGNAL_TEMPLATES = [
  (f: string) => `Thread on ${f} that was echoed by three other listed minds within a day.`,
  (f: string) => `Early read on ${f}; the theme trended roughly 48 hours later.`,
  (f: string) => `Long-form breakdown of ${f} with on-chain receipts attached.`,
  (f: string) => `Short call on ${f} that drew unusually high quality replies.`,
  (f: string) => `Follow-up on ${f}, correcting an earlier view and gaining reach.`,
];

const EPOCHS = [705, 706, 707, 708, 709, 710, 711, 712];
const CURRENT = 712;
const DAY = 86_400_000;
const ANCHOR = Date.UTC(2026, 9, 19); // epoch 712 starts Mon 19 Oct 2026
const METHOD = '0.1';

async function main() {
  console.log('Cleaning database...');
  await prisma.signal.deleteMany();
  await prisma.epochScore.deleteMany();
  await prisma.epoch.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.score.deleteMany();
  await prisma.signalSnapshot.deleteMany();
  await prisma.influencerIdentity.deleteMany();
  await prisma.influencerLink.deleteMany();
  await prisma.influencer.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding editor...');
  const editor = await prisma.user.create({
    data: { email: 'editor@siir.local', name: 'Seed Editor', passwordHash: 'not-a-login', role: 'editor' },
  });

  console.log('Seeding epochs...');
  for (const n of EPOCHS) {
    const start = ANCHOR - (CURRENT - n) * 7 * DAY;
    await prisma.epoch.create({
      data: {
        number: n,
        startsAt: new Date(start),
        endsAt: new Date(start + 7 * DAY),
        status: n === CURRENT ? 'live' : 'final',
        publishedBy: editor.id,
        publishedAt: new Date(start),
      },
    });
  }

  console.log('Generating trajectories...');
  const r = rng(712);
  const profiles = PEOPLE.map((p, i) => {
    const quality = 0.86 - (i / PEOPLE.length) * 0.4 + (r() - 0.5) * 0.12;
    return {
      p,
      base: {
        reach: clamp(quality + (r() - 0.5) * 0.16),
        engagement: clamp(quality + (r() - 0.5) * 0.2),
        narrative: clamp(quality + (r() - 0.5) * 0.2),
        // Bridged minds are strong on both chains by definition, so keep them above the Bridged threshold.
        onchain: Math.max(clamp(quality + (r() - 0.5) * 0.24), p.realm === 'bridged' ? 0.52 : 0),
        consistency: clamp(quality + (r() - 0.5) * 0.2),
      },
      trend: (r() - 0.5) * 0.03,
    };
  });

  // Score every mind in every epoch, then rank the top 33 of each.
  type Row = { handle: string; comps: Components; score: number };
  const perEpoch = new Map<number, Row[]>();
  for (const n of EPOCHS) {
    const noise = rng(n * 31);
    const rows = profiles.map(({ p, base, trend }) => {
      const drift = (c: number) => clamp(c + trend * (n - 708) + (noise() - 0.5) * 0.05);
      const comps: Components = {
        reach: drift(base.reach),
        engagement: drift(base.engagement),
        narrative: drift(base.narrative),
        onchain: drift(base.onchain),
        consistency: drift(base.consistency),
      };
      return { handle: p.handle, comps, score: computeScore(comps) };
    });
    rows.sort((a, b) => compareEntries({ score: a.score, narrative: a.comps.narrative }, { score: b.score, narrative: b.comps.narrative }));
    perEpoch.set(n, rows.slice(0, LIST_SIZE));
  }
  const listedEver = new Set([...perEpoch.values()].flat().map((x) => x.handle));
  const listedNow = new Set(perEpoch.get(CURRENT)!.map((x) => x.handle));

  console.log('Seeding minds...');
  const ids = new Map<string, string>();
  const infRows: Prisma.InfluencerCreateManyInput[] = [];
  const identityRows: Prisma.InfluencerIdentityCreateManyInput[] = [];
  const linkRows: Prisma.InfluencerLinkCreateManyInput[] = [];
  const dossierRows: Prisma.DossierCreateManyInput[] = [];
  const signalRows: Prisma.SignalCreateManyInput[] = [];
  let dossierNo = 0;
  for (const { p } of profiles) {
    const rr = rng(p.handle.length * 977 + p.handle.charCodeAt(0));
    const chains = p.realm === 'bridged' ? ['solana', 'robinhood'] : p.realm === 'velocity' ? ['solana'] : ['robinhood'];
    const status = listedNow.has(p.handle) ? 'published' : listedEver.has(p.handle) ? 'decohered' : 'draft';
    const id = randomUUID();
    ids.set(p.handle, id);

    infRows.push({
      id,
      name: p.name,
      handle: p.handle,
      slug: `${p.handle}-seed`,
      bio: `Analyst focused on ${p.focus}.`,
      realm: realmFromChains(chains),
      chains: chains.join(','),
      status,
      ownershipVerified: true,
      submittedBy: `seed:${p.handle}`,
      decoheredAt: status === 'decohered' ? new Date(ANCHOR) : null,
      decohereReason: status === 'decohered' ? 'Fell out of the top 33' : null,
    });
    chains.forEach((c, i) =>
      identityRows.push({
        influencerId: id,
        chainKey: c,
        address: c === 'solana' ? solAddress(rr) : evmAddress(rr),
        isPrimary: i === 0,
        verificationTier: 'verified',
        verificationMethod: 'rpc_activity',
      }),
    );
    linkRows.push({ influencerId: id, kind: 'x', url: `https://x.com/${p.handle}`, resolves: true, httpStatus: 200 });
    dossierNo++;
    dossierRows.push({
      influencerId: id,
      dossierNumber: dossierNo,
      title: `Why ${p.name} is Seen`,
      body: why(p, rr),
      verdict: status === 'published' ? 'Seen' : 'Previously Seen',
      aiDrafted: false,
      editorVerified: true,
      editorId: editor.id,
      publishedAt: new Date(ANCHOR),
      methodologyVersion: METHOD,
    });
    for (let s = 0; s < 4; s++) {
      signalRows.push({
        influencerId: id,
        url: `https://x.com/${p.handle}`,
        postedAt: new Date(ANCHOR + 2 * DAY - (s * 2 + 1) * DAY - Math.floor(rr() * DAY)),
        summary: SIGNAL_TEMPLATES[(s + Math.floor(rr() * 5)) % 5](p.focus),
        impact: s === 0 ? 'high' : s < 3 ? 'medium' : 'low',
      });
    }
  }
  await prisma.influencer.createMany({ data: infRows });
  await prisma.influencerIdentity.createMany({ data: identityRows });
  await prisma.influencerLink.createMany({ data: linkRows });
  await prisma.dossier.createMany({ data: dossierRows });
  await prisma.signal.createMany({ data: signalRows });

  console.log('Seeding epoch rankings...');
  const rankRows: Prisma.EpochScoreCreateManyInput[] = [];
  let prevRank = new Map<string, number>();
  for (const n of EPOCHS) {
    const listed = perEpoch.get(n)!;
    const nextRank = new Map<string, number>();
    listed.forEach((row, i) => {
      const rank = i + 1;
      nextRank.set(row.handle, rank);
      const before = prevRank.get(row.handle);
      const pct = (x: number) => Math.round(x * 1000) / 10;
      rankRows.push({
        influencerId: ids.get(row.handle)!,
        epochNumber: n,
        score: row.score,
        reachScore: pct(row.comps.reach),
        engagement: pct(row.comps.engagement),
        narrative: pct(row.comps.narrative),
        onchain: pct(row.comps.onchain),
        consistency: pct(row.comps.consistency),
        reachCount: Math.round(Math.pow(10, 7 * row.comps.reach)),
        rank,
        rankChange: n === EPOCHS[0] ? 0 : before === undefined ? null : before - rank,
        tier: tierForRank(rank),
      });
    });
    prevRank = nextRank;
  }
  await prisma.epochScore.createMany({ data: rankRows });

  console.log('Seeding signal snapshots and scores (inverse of the normalisation, so the numbers agree)...');
  const latestRows = new Map<string, Row>();
  for (const n of EPOCHS) for (const row of perEpoch.get(n)!) latestRows.set(row.handle, row);
  const snapRows: Prisma.SignalSnapshotCreateManyInput[] = [];
  const scoreRows: Prisma.ScoreCreateManyInput[] = [];
  for (const { p } of profiles) {
    const row = latestRows.get(p.handle);
    if (!row) continue;
    const influencerId = ids.get(p.handle)!;
    const c = row.comps;
    const chainSources = p.realm === 'bridged' ? ['solana-rpc', 'robinhood-rpc'] : [p.realm === 'ledger' ? 'robinhood-rpc' : 'solana-rpc'];
    const readings: [string, number, string][] = [
      [SIGNAL.followers, Math.round(Math.pow(10, 7 * c.reach)), 'x-api'],
      [SIGNAL.engagementRate, c.engagement * 0.06, 'x-api'],
      [SIGNAL.narrativeLead, c.narrative * 100, 'editorial'],
      ...chainSources.flatMap((source): [string, number, string][] => [
        [SIGNAL.txCount90d, Math.max(0, Math.round(Math.pow(10, 3.5 * c.onchain) - 1)), source],
        [SIGNAL.walletAgeDays, Math.round(c.onchain * 730), source],
      ]),
    ];
    readings.forEach(([signalKey, value, source]) =>
      snapRows.push({ influencerId, signalKey, value, source, methodVersion: METHOD, rawPayload: '{"seed":true}' }),
    );

    let streak = 0;
    for (const n of [...EPOCHS].reverse()) {
      const row = perEpoch.get(n)!.find((x) => x.handle === p.handle);
      if (!row || row.score < THRESHOLDS.consistencyScore) break;
      streak++;
    }
    const derived = deriveComponents(readings.map(([signalKey, value, source]) => ({ signalKey, value, source })), streak);
    const pct = (x: number) => Math.round(x * 1000) / 10;
    scoreRows.push({
      influencerId,
      methodologyVersion: METHOD,
      hardSignalScores: JSON.stringify({
        finalScore: computeScore(derived.components),
        reach: pct(derived.components.reach),
        engagement: pct(derived.components.engagement),
        narrative: pct(derived.components.narrative),
        onchain: pct(derived.components.onchain),
        consistency: pct(derived.components.consistency),
        reachCount: derived.reachCount,
        consecutiveEpochs: streak,
        evidenced: derived.evidenced,
        insufficientEvidence: false,
      }),
      editorialScore: c.narrative * 100,
      confidence: 1,
    });
  }
  await prisma.signalSnapshot.createMany({ data: snapRows });
  await prisma.score.createMany({ data: scoreRows });

  console.log(`Seeded ${PEOPLE.length} minds across ${EPOCHS.length} epochs.`);
  console.log(`Editor id for the editorial gate (x-editor-id): ${editor.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
