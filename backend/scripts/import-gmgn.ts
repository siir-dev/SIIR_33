/**
 * Imports GMGN 30-day wallet rankings (data/gmgn-wallets.csv) as unpublished candidates.
 *
 *   npx ts-node scripts/import-gmgn.ts          dry run, prints what would change
 *   npx ts-node scripts/import-gmgn.ts --apply  writes to the database
 *
 * Each run adds a fresh set of trading-result snapshots, so re-running every epoch keeps the on-chain component current.
 * Wallets are stored unverified: GMGN's X links are user-supplied and prove nothing about ownership.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { SIGNAL } from '../src/config/scoring';

const APPLY = process.argv.includes('--apply');
const CSV_PATH = join(__dirname, '..', '..', 'data', 'gmgn-wallets.csv');
const METHOD_VERSION = 'gmgn-import-1';

/** Accounts that no longer resolve on X as of 2026-10-25. They are skipped, not imported. */
const SKIP: Record<string, string> = {
  '0xlake': 'X account does not exist',
  snackyfn: 'X account suspended',
};

type Row = {
  chain: 'solana' | 'robinhood';
  rank: number;
  name: string;
  handle: string;
  address: string;
  pnl: number;
  winRate: number;
  trades: number;
  volume: number;
};

function parseMoney(s: string): number {
  const m = s.replace(/[+$,]/g, '').trim().match(/^(-?[\d.]+)([KM]?)$/i);
  if (!m) throw new Error(`Cannot parse amount "${s}"`);
  return Number(m[1]) * ({ '': 1, K: 1e3, M: 1e6 } as Record<string, number>)[m[2].toUpperCase()];
}

function readRows(): Row[] {
  const lines = readFileSync(CSV_PATH, 'utf8').trim().split(/\r?\n/);
  const header = lines.shift()!.split(',');
  const col = (cells: string[], key: string) => cells[header.indexOf(key)];
  return lines.map((line) => {
    const c = line.split(',');
    const [buys, sells] = col(c, 'txs_buy_sell_30d').split('/').map(Number);
    const chain = col(c, 'chain');
    if (chain !== 'solana' && chain !== 'robinhood') throw new Error(`Bad chain "${chain}"`);
    return {
      chain,
      rank: Number(col(c, 'rank')),
      name: col(c, 'name').replace(/\.\.\.$/, '').trim(),
      handle: col(c, 'x_handle').replace(/^@/, '').toLowerCase(),
      address: col(c, 'wallet_address'),
      pnl: parseMoney(col(c, 'pnl_30d')),
      winRate: parseFloat(col(c, 'win_rate_30d')) / 100,
      trades: buys + sells,
      volume: parseMoney(col(c, 'volume_30d')),
    };
  });
}

async function main() {
  const rows = readRows();
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of rows) {
    if (SKIP[r.handle]) {
      console.log(`SKIP    ${r.chain}#${r.rank} @${r.handle}: ${SKIP[r.handle]}`);
      skipped++;
      continue;
    }
    const existing = await prisma.influencer.findUnique({ where: { handle: r.handle }, include: { identities: true } });
    console.log(`${existing ? 'UPDATE ' : 'CREATE '} ${r.chain}#${r.rank} @${r.handle} trades=${r.trades} win=${(r.winRate * 100).toFixed(1)}% pnl=$${Math.round(r.pnl)}`);
    if (!APPLY) continue;

    const influencer =
      existing ??
      (await prisma.influencer.create({
        data: {
          name: r.name,
          handle: r.handle,
          slug: `${r.handle}-${Math.random().toString(36).slice(2, 8)}`,
          realm: r.chain === 'solana' ? 'velocity' : 'ledger',
          chains: r.chain,
          status: 'submitted',
          submittedBy: 'editorial-import',
          selectionRationale: `Source: GMGN ${r.chain === 'solana' ? 'Solana KOL' : 'Robinhood Chain'} 30D ranking #${r.rank}.`,
        },
      }));
    existing ? updated++ : created++;

    const hasIdentity = existing?.identities.some((i) => i.chainKey === r.chain && i.address.toLowerCase() === r.address.toLowerCase());
    if (!hasIdentity) {
      await prisma.influencerIdentity.create({
        data: { influencerId: influencer.id, chainKey: r.chain, address: r.address, verificationTier: 'unverified', verificationMethod: 'none' },
      });
    }
    if (!existing) {
      await prisma.influencerLink.create({ data: { influencerId: influencer.id, kind: 'x', url: `https://x.com/${r.handle}` } });
    }

    const source = `gmgn-${r.chain}`;
    const raw = JSON.stringify({ rank: r.rank, address: r.address, volumeUsd: r.volume });
    await prisma.signalSnapshot.createMany({
      data: [
        [SIGNAL.trades30d, r.trades],
        [SIGNAL.winRate30d, r.winRate],
        [SIGNAL.pnl30dUsd, r.pnl],
      ].map(([signalKey, value]) => ({ influencerId: influencer.id, signalKey: signalKey as string, value: value as number, source, methodVersion: METHOD_VERSION, rawPayload: raw })),
    });
  }

  console.log(`\n${APPLY ? 'Applied' : 'Dry run'}: ${created} created, ${updated} updated, ${skipped} skipped of ${rows.length} rows.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
