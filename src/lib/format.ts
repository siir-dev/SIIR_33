import type { Realm, Tier } from './api'

export const TIER_LABEL: Record<Tier, string> = {
  singular: 'Singular',
  oracle: 'Oracle',
  cortex: 'Cortex',
  synapse: 'Synapse',
  spark: 'Spark',
}

export const REALM_LABEL: Record<Realm, { chip: string; realm: string }> = {
  velocity: { chip: 'Solana', realm: 'Realm of Velocity · Solana' },
  ledger: { chip: 'Robinhood Chain', realm: 'Realm of Ledger · Robinhood Chain' },
  bridged: { chip: 'Bridged', realm: 'Bridged · strong in both realms' },
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

export function hue(handle: string): number {
  let h = 0
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) % 360
  return 208 + (h % 28) // stay within sky/azure range
}
