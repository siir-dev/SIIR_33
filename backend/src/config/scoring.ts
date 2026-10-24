import { THRESHOLDS, Tier, WEIGHTS } from './siir';
import { realmFromChains } from './explorer-registry';

/** Pure scoring helpers shared by ScoringService, the editorial gate and the seed script. */

export type ComponentKey = (typeof WEIGHTS)[number]['key'];
export type Components = Record<ComponentKey, number>; // each normalised to 0..1

export type SnapshotLike = { signalKey: string; value: number; source?: string };
export type Realm = 'velocity' | 'ledger' | 'bridged';
export type ChainScores = { solana?: number; robinhood?: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** SIIR = 100 x sum(w_i * norm(x_i)) */
export function computeScore(c: Components): number {
  const total = WEIGHTS.reduce((sum, w) => sum + w.weight * c[w.key], 0);
  return Math.round(total * 1000) / 10;
}

export function tierForRank(rank: number): Tier {
  if (rank === 1) return 'singular';
  if (rank <= 5) return 'oracle';
  if (rank <= 15) return 'cortex';
  if (rank <= 25) return 'synapse';
  return 'spark';
}

/** Ties are won by the higher Narrative lead. */
export function compareEntries(a: { score: number; narrative: number }, b: { score: number; narrative: number }): number {
  return b.score - a.score || b.narrative - a.narrative;
}

/** Signal keys written by the ingestion pipeline and the editorial gate. */
export const SIGNAL = {
  followers: 'followers_total',
  engagementRate: 'engagement_rate', // genuine interactions per post / followers, 0..1
  narrativeLead: 'narrative_lead', // 0..100, set by an editor
  txCount90d: 'onchain_tx_90d',
  txCountTotal: 'onchain_tx_total', // fallback for chains without an indexer
  walletAgeDays: 'wallet_age_days',
  consecutiveEpochs: 'consecutive_epochs',
  trades30d: 'onchain_trades_30d', // buys + sells in the last 30 days
  winRate30d: 'onchain_win_rate_30d', // 0..1
  pnl30dUsd: 'onchain_pnl_30d_usd', // realised profit, USD
} as const;

export interface DerivedComponents {
  components: Components;
  evidenced: Record<ComponentKey, boolean>;
  reachCount: number;
  onchainByChain: ChainScores;
  insufficientEvidence: boolean;
}

const CHAIN_OF_SOURCE: Record<string, 'solana' | 'robinhood'> = {
  'solana-rpc': 'solana',
  'robinhood-rpc': 'robinhood',
  'gmgn-solana': 'solana',
  'gmgn-robinhood': 'robinhood',
};

/** On-chain activity for one wallet group: 60% log of transactions, 40% wallet age. */
function activityNorm(tx?: number, ageDays?: number): number {
  return clamp01(0.6 * (tx ? clamp01(Math.log10(tx + 1) / 3.5) : 0) + 0.4 * (ageDays ? clamp01(ageDays / 730) : 0));
}

/**
 * Trading results over 30 days: half win rate (30% scores 0, 70% scores 1), half realised profit (log, $1M = 1.0).
 * Scaled down linearly when there are fewer trades than the minimum sample, so a perfect record on a handful of trades cannot win.
 */
export function resultsNorm(trades: number, winRate: number, pnlUsd: number): number {
  const win = clamp01((winRate - 0.3) / 0.4);
  const profit = clamp01(Math.log10(Math.max(0, pnlUsd) + 1) / 6);
  const sample = clamp01(trades / THRESHOLDS.tradeSampleMin);
  return sample * (0.5 * win + 0.5 * profit);
}

/** On-chain norm for one wallet group. With trading results it is half activity, half results; without, activity alone. */
export function onchainNorm(tx?: number, ageDays?: number, results?: { trades: number; winRate: number; pnlUsd: number }): number {
  const activity = activityNorm(tx, ageDays);
  if (!results) return activity;
  return clamp01(0.5 * activity + 0.5 * resultsNorm(results.trades, results.winRate, results.pnlUsd));
}

/** Newest on-chain snapshot per signal, grouped by the chain it came from. */
function groupOnchain(snapshots: SnapshotLike[]) {
  const groups = new Map<string, { tx90?: number; txTotal?: number; age?: number; trades?: number; win?: number; pnl?: number }>();
  const keys: string[] = [SIGNAL.txCount90d, SIGNAL.txCountTotal, SIGNAL.walletAgeDays, SIGNAL.trades30d, SIGNAL.winRate30d, SIGNAL.pnl30dUsd];
  for (const s of snapshots) {
    if (!keys.includes(s.signalKey)) continue;
    const group = CHAIN_OF_SOURCE[s.source ?? ''] ?? 'other';
    const g = groups.get(group) ?? {};
    // snapshots arrive newest-first, so the first one seen per key wins
    if (s.signalKey === SIGNAL.txCount90d && g.tx90 === undefined) g.tx90 = s.value;
    if (s.signalKey === SIGNAL.txCountTotal && g.txTotal === undefined) g.txTotal = s.value;
    if (s.signalKey === SIGNAL.walletAgeDays && g.age === undefined) g.age = s.value;
    if (s.signalKey === SIGNAL.trades30d && g.trades === undefined) g.trades = s.value;
    if (s.signalKey === SIGNAL.winRate30d && g.win === undefined) g.win = s.value;
    if (s.signalKey === SIGNAL.pnl30dUsd && g.pnl === undefined) g.pnl = s.value;
    groups.set(group, g);
  }
  return groups;
}

/**
 * Realm from measured on-chain strength. Bridged needs the on-chain component at or above the threshold on BOTH chains.
 * Without any on-chain data the realm falls back to the wallet chains, but never claims Bridged.
 */
export function realmFromOnchain(byChain: ChainScores, walletChains: string[], threshold = THRESHOLDS.bridgedOnchain): Realm {
  const sol = byChain.solana ?? 0;
  const rh = byChain.robinhood ?? 0;
  if (sol >= threshold && rh >= threshold) return 'bridged';
  if (sol >= threshold) return 'velocity';
  if (rh >= threshold) return 'ledger';
  if (sol || rh) return sol >= rh ? 'velocity' : 'ledger';
  const fromWallets = realmFromChains(walletChains);
  return fromWallets === 'bridged' ? (walletChains[0] === 'robinhood' ? 'ledger' : 'velocity') : fromWallets;
}

/**
 * Turns raw signal snapshots into the five normalised components.
 * Consistency is always evidenced (derived from epoch history); the other four need data.
 * Two or more unevidenced dimensions means the mind cannot be rated.
 */
export function deriveComponents(snapshots: SnapshotLike[], consecutiveEpochs = 0): DerivedComponents {
  const latest = new Map<string, number>();
  for (const s of snapshots) if (!latest.has(s.signalKey)) latest.set(s.signalKey, s.value);

  const followers = latest.get(SIGNAL.followers);
  const engagement = latest.get(SIGNAL.engagementRate);
  const narrative = latest.get(SIGNAL.narrativeLead);

  const groups = groupOnchain(snapshots);
  const byChain: ChainScores = {};
  let onchain = 0;
  for (const [group, g] of groups) {
    const hasResults = g.trades !== undefined && g.win !== undefined && g.pnl !== undefined;
    const score = onchainNorm(g.tx90 ?? g.txTotal ?? g.trades, g.age, hasResults ? { trades: g.trades!, winRate: g.win!, pnlUsd: g.pnl! } : undefined);
    if (group === 'solana' || group === 'robinhood') byChain[group] = score;
    onchain = Math.max(onchain, score); // a dormant second wallet must not drag down a strong first one
  }

  const evidenced: Record<ComponentKey, boolean> = {
    reach: followers !== undefined,
    engagement: engagement !== undefined,
    narrative: narrative !== undefined,
    onchain: groups.size > 0,
    consistency: true,
  };

  const components: Components = {
    reach: followers ? clamp01(Math.log10(Math.max(1, followers)) / 7) : 0, // 10M followers = 1.0
    engagement: engagement ? clamp01(engagement / 0.06) : 0, // 6% genuine interaction = 1.0
    narrative: narrative ? clamp01(narrative / 100) : 0,
    onchain,
    consistency: clamp01(consecutiveEpochs / THRESHOLDS.consistencyEpochsForFull),
  };

  const unevidenced = Object.values(evidenced).filter((e) => !e).length;
  return { components, evidenced, reachCount: Math.round(followers ?? 0), onchainByChain: byChain, insufficientEvidence: unevidenced >= 2 };
}
