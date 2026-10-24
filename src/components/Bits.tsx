import type { ReactNode } from 'react'
import type { Realm, Tier } from '../lib/api'
import { REALM_LABEL, TIER_LABEL, hue, initials } from '../lib/format'
import { useReveal } from '../lib/hooks'

/** Generated iris avatar: gradient disc, two orbit arcs, initials. */
export function Avatar({ handle, name, size = 48 }: { handle: string; name: string; size?: number }) {
  const h = hue(handle)
  const id = `av-${handle}-${size}`
  const tilt = (h * 7) % 360
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={name}>
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor={`hsl(${h} 95% 88%)`} />
          <stop offset="1" stopColor={`hsl(${h + 12} 78% 58%)`} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      <g transform={`rotate(${tilt} 50 50)`} fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M50 8a42 42 0 0 1 42 42" />
        <path d="M50 92a42 42 0 0 1-42-42" strokeOpacity="0.5" />
        <circle cx="50" cy="50" r="30" strokeOpacity="0.28" strokeDasharray="1 5" />
      </g>
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="avatar-text" fontSize="30">
        {initials(name)}
      </text>
    </svg>
  )
}

export function ScoreGauge({ score, size = 132, live = false }: { score: number; size?: number; live?: boolean }) {
  const r = 52
  const c = 2 * Math.PI * r
  const arc = c * 0.75
  const filled = (Math.min(100, Math.max(0, score)) / 100) * arc
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--siir-sky-300)" />
            <stop offset="1" stopColor="var(--siir-azure-700)" />
          </linearGradient>
        </defs>
        <g transform="rotate(135 66 66)" fill="none" strokeLinecap="round">
          <circle cx="66" cy="66" r={r} stroke="var(--hair)" strokeWidth="6" strokeDasharray={`${arc} ${c}`} />
          <circle
            className="gauge-fill"
            cx="66"
            cy="66"
            r={r}
            stroke="url(#gauge-grad)"
            strokeWidth="6"
            strokeDasharray={`${filled} ${c}`}
          />
        </g>
      </svg>
      <div className="gauge-text">
        <b>{score.toFixed(1)}</b>
        <small>SIIR Score{live && <Live />}</small>
      </div>
    </div>
  )
}

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier tier--${tier}`}>{TIER_LABEL[tier]}</span>
}

export function RealmChip({ realm }: { realm: Realm }) {
  const { chip, realm: title } = REALM_LABEL[realm]
  return (
    <span className={`chip chip--${realm}`} title={title}>
      <i className="chip-dot" />
      {chip}
    </span>
  )
}

export function Change({ value, isNew }: { value: number | null; isNew: boolean }) {
  if (isNew) return <span className="change change--new">NEW</span>
  if (!value) return <span className="change change--flat">-</span>
  return (
    <span className={`change ${value > 0 ? 'change--up' : 'change--down'}`}>
      {value > 0 ? `↑ +${value}` : `↓ ${value}`}
    </span>
  )
}

export function Sparkline({ values, width = 80, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="spark-empty" style={{ width, height }} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)])
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--siir-sky-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill="var(--siir-sky-500)" />
    </svg>
  )
}

export function Live() {
  return (
    <span className="live">
      <i /> LIVE
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal ${shown ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export function State({ loading, error }: { loading: boolean; error?: string }) {
  if (loading)
    return (
      <div className="skeleton" aria-busy="true" aria-label="Loading">
        <i /> <i /> <i />
      </div>
    )
  if (error) return <p className="state state--error">Could not load data: {error}</p>
  return null
}
