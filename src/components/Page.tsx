import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '../lib/router'

/** Shared building blocks for the inner pages: observatory hero, section headings, count-up numbers. */

type HeroBg = 'hero' | 'banner' | 'rising' | 'realms' | 'none'

export function PageHero({
  tone = 'sky',
  bg = 'none',
  crumbs,
  eyebrow,
  title,
  dek,
  art,
  children,
  ticker,
}: {
  tone?: 'sky' | 'night'
  bg?: HeroBg
  crumbs: { label: string; href?: string }[]
  eyebrow: string
  title: ReactNode
  dek?: ReactNode
  art?: ReactNode
  children?: ReactNode
  ticker?: string[]
}) {
  return (
    <header className={`phero phero--${tone} phero--bg-${bg}`}>
      <div className="phero-grid" aria-hidden="true" />
      <i className="phero-ring phero-ring--a" aria-hidden="true" />
      <i className="phero-ring phero-ring--b" aria-hidden="true" />
      <div className="phero-inner">
        <div className="phero-copy">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">SIIR</Link>
            {crumbs.map((c) => (
              <span key={c.label}>
                <i aria-hidden="true" />
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
          <span className="phero-eyebrow">{eyebrow}</span>
          <h1 className="phero-title">{title}</h1>
          {dek && <p className="phero-dek">{dek}</p>}
          {children && <div className="phero-extra">{children}</div>}
        </div>
        {art && <div className="phero-art">{art}</div>}
      </div>
      {ticker && (
        <ul className="phero-ticker" aria-label="Status">
          {ticker.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </header>
  )
}

/** Mono label with a glowing square and a hairline that runs to the edge. */
export function FxHeading({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <h2 className="fx-h">
      <i aria-hidden="true" />
      {index && <b>{index}</b>}
      <span>{children}</span>
      <em aria-hidden="true" />
    </h2>
  )
}

/** Counts up to a number when it mounts. Honours reduced motion. */
export function CountUp({ to, decimals = 0, suffix = '', duration = 900 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(to * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to, duration])

  return (
    <span className="mono">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}
