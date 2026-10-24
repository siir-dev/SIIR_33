import { useState, type CSSProperties } from 'react'
import { Check, Copy, ShareNetwork } from '@phosphor-icons/react'
import { Avatar, Change, RealmChip, Reveal, ScoreGauge, State, TierBadge } from '../components/Bits'
import { FxHeading } from '../components/Page'
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
      <header className="phero phero--sky phero--bg-banner phero--profile">
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
                <Avatar handle={p.handle} name={p.name} size={132} />
              </span>
              <div>
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
          <blockquote className="pull">{p.why}</blockquote>
        </Reveal>

        <div className="pf-cols">
          <Reveal className="fx-card pf-card">
            <FxHeading index="02">SIIR Score over time</FxHeading>
            <ScoreChart data={history} />
          </Reveal>

          {current && (
            <Reveal className="fx-card pf-card">
              <FxHeading index="03">Components, epoch {current.epoch}</FxHeading>
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
            <p className="pg-note">No public signals recorded yet.</p>
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
                  <Avatar handle={a.handle} name={a.name} size={46} />
                  <strong>{a.name}</strong>
                  <small className="mono">@{a.handle}</small>
                  <span className="also-meta">
                    <b className="also-rank">#{a.rank}</b>
                    <TierBadge tier={a.tier} />
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
