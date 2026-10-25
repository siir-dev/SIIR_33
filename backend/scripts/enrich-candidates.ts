/**
 * Enriches the imported candidates with real readings and draft editorial material. Nothing is published and no
 * judgement is invented:
 *
 *  - X reach and engagement from data/x-metrics.json (read from public profile pages)
 *  - wallet activity checked against the chain RPC, exactly as the nomination pipeline does it
 *  - on-chain footprint signals from the RPC
 *  - a score row per mind, from the shared scoring rules (Narrative stays unevidenced: only an editor can set it)
 *  - an AI-drafted, unverified "Why they're Seen" dossier built only from those readings
 *
 *   npx ts-node scripts/enrich-candidates.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { IngestService } from '../src/influencers/ingest.service';
import { ScoringService, METHODOLOGY_VERSION } from '../src/editorial/scoring.service';
import { SIGNAL } from '../src/config/scoring';
import { CHAINS, isChainKey } from '../src/config/explorer-registry';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  /* Prisma loads .env on its own */
}

type Metrics = Record<string, { followers: number; avgInteractions: number; sample: number }>;
const MIN_ENGAGEMENT_SAMPLE = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

async function main() {
  const prisma = new PrismaClient();
  const ingest = new IngestService();
  const scoring = new ScoringService(prisma as never);
  const metrics: Metrics = JSON.parse(readFileSync(join(__dirname, '..', '..', 'data', 'x-metrics.json'), 'utf8'));

  const infs = await prisma.influencer.findMany({ where: { submittedBy: 'editorial-import' }, include: { identities: true } });
  console.log(`${infs.length} candidates`);

  // 1. Editor account (the editorial gate needs a real user row)
  const editorEmail = process.env.SIIR_EDITOR_EMAIL;
  if (editorEmail) {
    await prisma.user.upsert({
      where: { email: editorEmail },
      update: {},
      create: { email: editorEmail, passwordHash: 'not-a-login', role: 'editor', name: 'SIIR Editor' },
    });
    console.log(`Editor account ready: ${editorEmail}`);
  }

  for (const inf of infs) {
    const m = metrics[inf.handle];
    const rows: { signalKey: string; value: number; source: string; raw: unknown }[] = [];

    // 2. Reach and engagement
    if (m) {
      rows.push({ signalKey: SIGNAL.followers, value: m.followers, source: 'x-web', raw: { read: '2026-10-25' } });
      if (m.sample >= MIN_ENGAGEMENT_SAMPLE && m.followers > 0) {
        rows.push({ signalKey: SIGNAL.engagementRate, value: Math.min(1, m.avgInteractions / m.followers), source: 'x-web', raw: { avgInteractions: m.avgInteractions, sample: m.sample } });
      }
    }

    // 3. Wallet activity check, then on-chain signals
    for (const id of inf.identities) {
      if (!isChainKey(id.chainKey) || !CHAINS[id.chainKey].rpcUrl()) continue;
      try {
        const active = await ingest.hasOnchainActivity(id.chainKey, id.address);
        await prisma.influencerIdentity.update({
          where: { id: id.id },
          data: { verificationTier: active ? 'verified' : 'unverified', verificationMethod: active ? 'rpc_activity' : 'none', lastCheckedAt: new Date() },
        });
        if (active) {
          for (const r of await ingest.fetchOnchainSignals(id.chainKey, id.address)) rows.push({ signalKey: r.signalKey, value: r.value, source: r.source, raw: r.raw });
        }
        console.log(`  @${inf.handle} ${id.chainKey}: ${active ? 'active (rpc_activity)' : 'no activity found'}`);
      } catch (e) {
        console.warn(`  @${inf.handle} ${id.chainKey}: RPC check failed (${(e as Error).message})`);
      }
      await sleep(400);
    }

    if (rows.length) {
      await prisma.signalSnapshot.createMany({
        data: rows.map((r) => ({ influencerId: inf.id, signalKey: r.signalKey, value: r.value, source: r.source, methodVersion: METHODOLOGY_VERSION, rawPayload: JSON.stringify(r.raw ?? {}) })),
      });
    }
  }

  // 4. Scores and draft dossiers
  let number = (await prisma.dossier.aggregate({ _max: { dossierNumber: true } }))._max.dossierNumber ?? 0;
  for (const inf of infs) {
    const score = await scoring.calculateInfluencerScore(inf.id);
    const h = JSON.parse(score.hardSignalScores);
    const fresh = await prisma.influencer.findUniqueOrThrow({ where: { id: inf.id }, include: { identities: true } });
    console.log(`@${inf.handle} confidence=${score.confidence} score=${h.finalScore} realm=${fresh.realm}`);
    if (score.confidence === 0) continue; // not enough evidence yet: no draft

    const m = metrics[inf.handle];
    const chain = fresh.chains.split(',')[0] === 'robinhood' ? 'Robinhood Chain' : 'Solana';
    const exists = await prisma.dossier.findFirst({ where: { influencerId: inf.id } });
    if (exists) continue;
    number += 1;
    await prisma.dossier.create({
      data: {
        influencerId: inf.id,
        dossierNumber: number,
        title: `On the radar: ${fresh.name}`,
        body: `${fresh.name} reaches ${fmt(m.followers)} followers on X and keeps an active ${chain} wallet. Drafted from public readings only; an editor still has to judge how early this mind calls what later trends.`,
        verdict: `Rated on reach, engagement and on-chain footprint. Narrative lead not yet judged.`,
        aiDrafted: true,
        editorVerified: false,
        methodologyVersion: METHODOLOGY_VERSION,
      },
    });
    await prisma.influencer.update({ where: { id: inf.id }, data: { status: 'draft' } });
  }

  const counts = {
    snapshot: await prisma.signalSnapshot.count(),
    score: await prisma.score.count(),
    dossier: await prisma.dossier.count(),
    verifiedWallets: await prisma.influencerIdentity.count({ where: { verificationTier: { not: 'unverified' } } }),
    drafts: await prisma.influencer.count({ where: { status: 'draft' } }),
    user: await prisma.user.count(),
  };
  console.log(JSON.stringify(counts));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
