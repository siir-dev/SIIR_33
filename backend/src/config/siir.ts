export const LIST_SIZE = 33;

export type Tier = 'singular' | 'oracle' | 'cortex' | 'synapse' | 'spark';

export const TIERS: { key: Tier; label: string; ranks: string; meaning: string }[] = [
  { key: 'singular', label: 'Singular', ranks: '#1', meaning: 'The single top mind of this epoch' },
  { key: 'oracle', label: 'Oracle', ranks: '#2-5', meaning: 'Shapes the narrative instead of following it' },
  { key: 'cortex', label: 'Cortex', ranks: '#6-15', meaning: 'Consistent influence across chains' },
  { key: 'synapse', label: 'Synapse', ranks: '#16-25', meaning: 'Rising, signal strengthening' },
  { key: 'spark', label: 'Spark', ranks: '#26-33', meaning: 'Newly on the Seer radar' },
];

export const WEIGHTS = [
  { key: 'reach', label: 'Reach', weight: 0.2, measures: 'Total audience on X and other platforms, log-normalised.' },
  { key: 'engagement', label: 'Engagement quality', weight: 0.25, measures: 'Share of genuine interaction per post. Bots and engagement farms are filtered out.' },
  { key: 'narrative', label: 'Narrative lead', weight: 0.25, measures: 'How often they cover a token or theme before it trends.' },
  { key: 'onchain', label: 'On-chain footprint', weight: 0.2, measures: 'Verified wallet activity on Solana and Robinhood Chain.' },
  { key: 'consistency', label: 'Consistency', weight: 0.1, measures: 'Consecutive epochs with a score above the threshold.' },
] as const;

export const DISCLAIMER =
  'Rankings are not investment advice. Nobody pays to enter the list. Scores are derived from public data.';

/** Thresholds referenced by the methodology. Proposals until signed off before launch; override per environment. */
const num = (v: string | undefined, fallback: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback);

export const THRESHOLDS = {
  /** An epoch counts toward Consistency only if the mind was listed with at least this SIIR Score. */
  consistencyScore: num(process.env.SIIR_CONSISTENCY_THRESHOLD, 60),
  /** A chain counts toward the Bridged badge when the on-chain component for that chain is at least this (0-1). */
  bridgedOnchain: num(process.env.SIIR_BRIDGED_ONCHAIN_THRESHOLD, 0.4),
  /** Consistency reaches 1.0 after this many consecutive qualifying epochs. */
  consistencyEpochsForFull: 8,
  /** Trading results (win rate, profit) count in full only with at least this many trades in 30 days; fewer scales them down. */
  tradeSampleMin: num(process.env.SIIR_TRADE_SAMPLE_MIN, 30),
};

export const NORMALISATION = [
  { key: 'reach', rule: 'log10(followers) / 7, capped at 1. 10 million followers scores 1.0.' },
  { key: 'engagement', rule: 'Interactions per post divided by followers, divided by 6%, capped at 1.' },
  { key: 'narrative', rule: 'An editor scores 0-100 on how early the mind called themes that later trended. Divided by 100.' },
  {
    key: 'onchain',
    rule: `Per chain: activity (60% log10(transactions) / 3.5 plus 40% wallet age / 730 days). Where 30-day trading results are on record, half activity and half results: win rate (30% scores 0, 70% scores 1) and realised profit (log10, $1M scores 1), scaled down below ${THRESHOLDS.tradeSampleMin} trades. The component is the stronger chain.`,
  },
  { key: 'consistency', rule: `Consecutive epochs listed with a score of at least ${THRESHOLDS.consistencyScore}, divided by ${THRESHOLDS.consistencyEpochsForFull}.` },
] as const;

export const SOURCES = [
  { label: 'Reach and engagement', source: 'X API v2 public metrics (followers, likes, replies, reposts, quotes).' },
  { label: 'On-chain footprint', source: 'Solana RPC and Robinhood Chain RPC for activity, GMGN public rankings for 30-day trading results. Wallets stay unverified until the owner signs.' },
  { label: 'Narrative lead', source: 'Editorial judgement, recorded with the editor who made it.' },
  { label: 'Consistency', source: 'SIIR epoch history.' },
] as const;

export const RULES = [
  `Entry: the ${LIST_SIZE} highest scores of the epoch, with at least one verified wallet.`,
  `Bridged badge: the on-chain component is at least ${Math.round(THRESHOLDS.bridgedOnchain * 100)}% on both Solana and Robinhood Chain.`,
  `Decohered: falling out of the top ${LIST_SIZE}. The profile stays, labelled Previously Seen.`,
  'Ties go to the higher Narrative lead.',
  'A mind with fewer than four of the five components evidenced cannot be rated.',
] as const;
