const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export type Realm = 'velocity' | 'ledger' | 'bridged'
export type Tier = 'singular' | 'oracle' | 'cortex' | 'synapse' | 'spark'

export interface Entry {
  rank: number
  rankChange: number | null
  isNew: boolean
  tier: Tier
  score: number
  reach: number
  spark: number[]
  influencer: { handle: string; name: string; bio: string; why: string; realm: Realm }
}

export interface EpochMeta {
  number: number
  startsAt: string
  endsAt: string
  status: 'live' | 'final'
}

export interface EpochBoard {
  epoch: EpochMeta
  entries: Entry[]
}

export interface EpochSummary extends EpochMeta {
  singular: { handle: string; name: string; score: number } | null
}

export interface Profile {
  influencer: { handle: string; name: string; bio: string; why: string; realm: Realm; wallets: number }
  previouslySeen: boolean
  current: {
    epoch: number
    rank: number
    rankChange: number | null
    tier: Tier
    score: number
    reach: number
    components: Record<'reach' | 'engagement' | 'narrative' | 'onchain' | 'consistency', number>
  } | null
  stats: { peakRank: number | null; firstEpoch: number | null; epochsListed: number }
  history: { epoch: number; score: number; rank: number }[]
  signals: { id: string; url: string; postedAt: string; summary: string; impact: 'high' | 'medium' | 'low' }[]
  also: { handle: string; name: string; realm: Realm; rank: number; tier: Tier; score: number }[]
}

export interface Methodology {
  listSize: number
  formula: string
  weights: { key: string; label: string; weight: number; measures: string }[]
  normalisation: { key: string; rule: string }[]
  thresholds: { consistencyScore: number; bridgedOnchain: number; consistencyEpochsForFull: number }
  sources: { label: string; source: string }[]
  rules: string[]
  tiers: { key: Tier; label: string; ranks: string; meaning: string }[]
  disclaimer: string
}

export interface NominationBody {
  name: string
  handle: string
  bio?: string
  wallets: { chainKey: 'solana' | 'robinhood'; address: string }[]
  website?: string
  rationale?: string
  submitterWallet: string
  signature: string
}

export interface Candidate {
  handle: string
  name: string
  avatarUrl: string | null
  realm: Realm
  onchain: number
  wallets: { chainKey: string; verified: boolean }[]
}

export interface MyNomination {
  handle: string
  name: string
  status: string
  realm: Realm
  submittedAt: string
  processAfter: string | null
  identities: { chainKey: string; address: string; verificationTier: string }[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new Error(message ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export const api = {
  epoch: (ref: string | number = 'current') => request<EpochBoard>(`/epochs/${ref}`),
  epochs: () => request<EpochSummary[]>('/epochs'),
  profile: (handle: string) => request<Profile>(`/seen/${encodeURIComponent(handle)}`),
  methodology: () => request<Methodology>('/methodology'),
  subscribe: (email: string) =>
    request<{ subscribed: boolean }>('/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  nominate: (body: NominationBody) =>
    request<{ influencerId: string; handle: string; status: string; message: string }>('/influencers/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  candidates: () => request<Candidate[]>('/influencers/candidates'),
  myNominations: (wallet: string) => request<MyNomination[]>(`/influencers?walletAddress=${encodeURIComponent(wallet)}`),
}
