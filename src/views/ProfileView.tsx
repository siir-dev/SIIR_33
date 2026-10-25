import { useState, type CSSProperties } from 'react'
import { Check, Copy, Pulse, ShareNetwork } from '@phosphor-icons/react'
import { Avatar, Change, RealmChip, Reveal, ScoreGauge, State, TierBadge } from '../components/Bits'
import { FxHeading } from '../components/Page'
import { RadarChart } from '../components/RadarChart'
import { ScoreChart } from '../components/ScoreChart'
import { api } from '../lib/api'
import { compact, formatDate } from '../lib/format'
import { useAsync, usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'

const COMPONENT_LABELS = [
  ['reach', 'Reach'],
  ['engagement', 'Engagement quality'],
  ['narrative', 'Narrative lead'],
  ['onchain', 'On-chain footprint'],
  ['consistency', 'Consistency'],
] as const

function ShareCard({ handle, name, rank }: { handle: string; name: string; rank: number | null }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/seen/${handle}`
  const text = rank ? `${name} is #${rank} on The SIIR 33.` : `${name} on The SIIR 33.`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the link is still visible */
    }
  }
  return (
    <div className="fx-card share">
      <img src={`/api/v1/og/${handle}.png`} width={1200} height={630} loading="lazy" decoding="async" alt={`Share card for ${name}`} />
      <div className="share-actions">
        <p className="share-kicker">
          <i aria-hidden="true" />
          BROADCAST THIS SIGNAL
        </p>
        <code className="share-url">{url.replace(/^https?:\/\//, '')}</code>
        <a className="btn btn-dark" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
          <ShareNetwork size={16} /> Post on X
        </a>
        <button type="button" className="btn btn-light" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

export function ProfileView({ handle }: { handle: string }) {
  const { data, loading, error } = useAsync(() => api.profile(handle), [handle])
  usePageMeta(
    data ? `${data.influencer.name} (@${data.influencer.handle}) - SIIR` : 'Profile - SIIR',
    data ? `${data.influencer.name} on The SIIR 33. ${data.influencer.bio}` : 'A profile on The SIIR 33.',
  )

  if (loading || error || !data)
    return (
      <div className="pg pg--top">
        <State loading={loading} error={error} />
        {error && <Link href="/">← Back to The SIIR 33</Link>}
      </div>
    )

  const { influencer: p, current, stats, history, signals, also } = data
  const stat: [string, string][] = current
    ? [
        [data.previouslySeen ? 'Last rank' : 'Rank', `#${current.rank}`],
        ['Peak rank', stats.peakRank ? `#${stats.peakRank}` : 'None'],
        ['First Seen', stats.firstEpoch ? `Epoch ${stats.firstEpoch}` : 'None'],
        ['Reach', compact(current.reach)],
        ['Epochs listed', String(stats.epochsListed)],
        ['Verified wallets', String(p.wallets)],
      ]
    : []

  return (
    <>
      <header className="phero phero--sky phero--bg-home phero--profile">
        <div className="phero-grid" aria-hidden="true" />
        <i className="phero-ring phero-ring--a" aria-hidden="true" />
        <div className="phero-inner">
          <div className="phero-copy">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">SIIR</Link>
              <span>
                <i aria-hidden="true" />
                <span aria-current="page">@{p.handle}</span>
              </span>
            </nav>
            <div className="pf-id">
              <span className="pf-avatar">
                <Avatar handle={p.handle} name={p.name} size={160} src={p.avatarUrl} />
              </span>
              <div>
                <p className="pf-tag">
                  <i aria-hidden="true" />
                  {current ? `SUBJECT FILE · EPOCH ${current.epoch}` : 'SUBJECT FILE'}
                </p>
                <h1 className="phero-title pf-name">{p.name}</h1>
                <p className="pf-handle">
                  <a href={`https://x.com/${p.handle}`} target="_blank" rel="noreferrer">
                    @{p.handle}
                  </a>
                </p>
                <div className="pf-badges">
                  {current && <TierBadge tier={current.tier} />}
                  <RealmChip realm={p.realm} />
                  {data.previouslySeen && <span className="tier tier--prev">Previously Seen</span>}
                </div>
              </div>
            </div>
            <p className="phero-dek">{p.bio}</p>
          </div>
          {current && (
            <div className="phero-art pf-score">
              <span className="pf-rank" aria-hidden="true">
                {current.rank}
              </span>
              <div className="pf-gauge">
                <ScoreGauge score={current.score} live={!data.previouslySeen} size={170} />
              </div>
              <p className="pf-delta">
                <Change value={current.rankChange} isNew={current.rankChange === null} />
                <small>Epoch {current.epoch}</small>
              </p>
            </div>
          )}
        </div>
        {current && (
          <ul className="phero-ticker" aria-label="Stat block">
            {stat.map(([k, v]) => (
              <li key={k}>
                <small>{k}</small> <b className="mono">{v}</b>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="pg pg--wide">
        <Reveal>
          <FxHeading index="01">Why they&apos;re Seen</FxHeading>
          <div className="pf-dossier">
            <blockquote className="pull pull--sm">{p.why}</blockquote>
            {current && (
              <ul className="readout" aria-label="Signal readout">
                {(
                  [
                    ['Reach', compact(current.reach), current.components.reach],
                    ['Engagement', `${current.components.engagement.toFixed(0)}`, current.components.engagement],
                    ['On-chain', `${current.components.onchain.toFixed(0)}`, current.components.onchain],
                    ['Narrative', `${current.components.narrative.toFixed(0)}`, current.components.narrative],
                  ] as [string, string, number][]
                ).map(([k, v, pct], i) => (
                  <li key={k} style={{ '--v': `${Math.min(100, pct)}%`, '--i': i } as CSSProperties}>
                    <small>{k}</small>
                    <b className="mono">{v}</b>
                    <i aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>

        <div className="pf-cols">
          <Reveal className="fx-card pf-card">
            <FxHeading index="02">SIIR Score over time</FxHeading>
            <ScoreChart data={history} />
            {history.length > 0 && (
              <ul className="chart-stats" aria-label="Score summary">
                <li>
                  <small>Latest</small>
                  <b className="mono">{history[history.length - 1].score.toFixed(1)}</b>
                </li>
                <li>
                  <small>Peak</small>
                  <b className="mono">{Math.max(...history.map((h) => h.score)).toFixed(1)}</b>
                </li>
                <li>
                  <small>Best rank</small>
                  <b className="mono">#{Math.min(...history.map((h) => h.rank))}</b>
                </li>
                <li>
                  <small>Epochs</small>
                  <b className="mono">{history.length}</b>
                </li>
              </ul>
            )}
          </Reveal>

          {current && (
            <Reveal className="fx-card pf-card">
              <FxHeading index="03">Components, epoch {current.epoch}</FxHeading>
              <RadarChart values={current.components} label={`Component profile for ${p.name}`} />
              <ul className="gbars">
                {COMPONENT_LABELS.map(([k, label], i) => (
                  <li key={k} style={{ '--v': `${current.components[k]}%`, '--i': i } as CSSProperties}>
                    <span>{label}</span>
                    <b className="mono">{current.components[k].toFixed(0)}</b>
                    <i aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        <Reveal>
          <FxHeading index="04">Latest signals</FxHeading>
          {signals.length === 0 ? (
            <div className="fx-card sig-empty">
              <Pulse size={28} weight="duotone" aria-hidden="true" />
              <div>
                <strong>No dated signal on record yet</strong>
                <p>An editor logs a signal when a mind states a view that can be checked later. The Narrative lead rises with it.</p>
              </div>
            </div>
          ) : (
            <ol className="sigline">
              {signals.map((s) => (
                <li key={s.id} className={`sig sig--${s.impact}`}>
                  <span className="sig-node" aria-hidden="true" />
                  <a href={s.url} target="_blank" rel="noreferrer">
                    <span className="sig-top">
                      <span className={`impact impact--${s.impact}`}>{s.impact}</span>
                      <time className="mono" dateTime={s.postedAt}>
                        {formatDate(s.postedAt)}
                      </time>
                    </span>
                    <p>{s.summary}</p>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </Reveal>

        <Reveal>
          <FxHeading index="05">Share</FxHeading>
          <ShareCard handle={p.handle} name={p.name} rank={current && !data.previouslySeen ? current.rank : null} />
        </Reveal>

        {also.length > 0 && (
          <Reveal>
            <FxHeading index="06">Also Seen</FxHeading>
            <div className="also-grid">
              {also.map((a) => (
                <Link key={a.handle} href={`/seen/${a.handle}`} className="fx-card also-fx">
                  <span className="also-ghost" aria-hidden="true">
                    {a.rank}
                  </span>
                  <span className="also-photo">
                    <Avatar handle={a.handle} name={a.name} size={64} src={a.avatarUrl} />
                  </span>
                  <strong>{a.name}</strong>
                  <small className="mono">@{a.handle}</small>
                  <span className="also-score" aria-label={`SIIR Score ${a.score.toFixed(1)}`}>
                    <b className="mono">{a.score.toFixed(1)}</b>
                    <i style={{ '--v': `${Math.min(100, a.score)}%` } as CSSProperties} aria-hidden="true" />
                  </span>
                  <span className="also-meta">
                    <b className="also-rank">#{a.rank}</b>
                    <TierBadge tier={a.tier} />
                    <RealmChip realm={a.realm} />
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </>
  )
}
