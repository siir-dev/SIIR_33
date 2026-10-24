import type { Realm } from '../lib/api'

export function SolanaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="sol-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--siir-solana)" />
          <stop offset="1" stopColor="var(--tier-oracle)" />
        </linearGradient>
      </defs>
      <g fill="url(#sol-g)">
        <path d="M5 16.2h13.2c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H2.4c-.3 0-.5-.4-.3-.6l2.4-2.4c.1-.1.3-.2.5-.2z" />
        <path d="M5 4.6h13.2c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H2.4c-.3 0-.5-.4-.3-.6l2.4-2.4c.1-.1.3-.2.5-.2z" />
        <path d="M16.1 10.4H2.9c-.3 0-.5.4-.3.6L5 13.4c.1.1.3.2.5.2h13.2c.3 0 .5-.4.3-.6l-2.4-2.4c-.1-.1-.3-.2-.5-.2z" transform="translate(1.4 0)" />
      </g>
    </svg>
  )
}

export function RobinhoodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--siir-robinhood)" />
      <path d="M7 17c1-5 4-9 10-10-1 5-4 9-10 10zM7 17l5-5" fill="none" stroke="var(--siir-night)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RealmIcons({ realm, size = 20 }: { realm: Realm; size?: number }) {
  return (
    <span className="realm-icons" title={realm === 'velocity' ? 'Solana' : realm === 'ledger' ? 'Robinhood Chain' : 'Solana + Robinhood Chain'}>
      {realm !== 'ledger' && <SolanaIcon size={size} />}
      {realm !== 'velocity' && <RobinhoodIcon size={size} />}
    </span>
  )
}
