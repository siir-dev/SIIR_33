import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowRight, ArrowUp } from '@phosphor-icons/react'
import type { Entry, EpochBoard, Realm, Tier } from '../lib/api'
import { compact, formatDate, TIER_LABEL } from '../lib/format'
import { Link } from '../lib/router'
import { Avatar, Change, RealmChip, Sparkline, TierBadge } from './Bits'
import { Art3D } from './Art'
import { Select } from './Select'
import { RealmIcons } from './Icons'

type RealmFilter = 'all' | Realm
const REALM_FILTERS: { key: RealmFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'velocity', label: 'Solana' },
  { key: 'ledger', label: 'Robinhood Chain' },
  { key: 'bridged', label: 'Bridged' },
]
const TIER_FILTERS: { key: Tier | 'all'; label: string }[] = [
  { key: 'all', label: 'All tiers' },
  { key: 'singular', label: 'Singular' },
  { key: 'oracle', label: 'Oracle' },
  { key: 'cortex', label: 'Cortex' },
  { key: 'synapse', label: 'Synapse' },
  { key: 'spark', label: 'Spark' },
]
const PREVIEW = 5

interface Props {
  board: EpochBoard
  title: string
  dek: string
  eyebrow?: string
  /** Home shows the top 5 and expands in place; archive pages show everything. */
  collapsible?: boolean
  /** Hide the title block when the page already has a hero. */
  bare?: boolean
}

export function scoreDelta(spark: number[]): number {
  return spark.length > 1 ? spark[spark.length - 1] - spark[spark.length - 2] : 0
}

export function RankingBoard({ board, title, dek, eyebrow, collapsible = false, bare = false }: Props) {
  const [realm, setRealm] = useState<RealmFilter>('all')
  const [tier, setTier] = useState<Tier | 'all'>('all')
  const [expanded, setExpanded] = useState(!collapsible)
  const { epoch, entries } = board

  const filtered = useMemo(
    () => entries.filter((e) => (realm === 'all' || e.influencer.realm === realm) && (tier === 'all' || e.tier === tier)),
    [entries, realm, tier],
  )
  const shown = expanded ? filtered : filtered.slice(0, PREVIEW)
  const [hero, ...rows] = shown

  return (
    <section id="ranking" className="board">
      <header className={bare ? 'board-head board-head--bare' : 'board-head'}>
        <div className="board-titles" hidden={bare}>
          <span className="eyebrow">{eyebrow ?? `THE SIIR ${entries.length}`}</span>
          <h2 className="board-title">{title}</h2>
          <p className="board-dek">{dek}</p>
          {!collapsible && (
            <p className="board-meta">
              <span>{epoch.status === 'live' ? `Updated ${formatDate(epoch.startsAt)}` : `Final · ${formatDate(epoch.endsAt)}`}</span>
              <Link href="/methodology">Methodology</Link>
            </p>
          )}
        </div>
        <div className="filters">
          <div className="seg" role="group" aria-label="Filter by realm">
            {REALM_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`seg-btn ${realm === f.key ? 'is-on' : ''}`}
                aria-pressed={realm === f.key}
                onClick={() => setRealm(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Select
            className="sel--pill"
            label="Filter by tier"
            value={tier}
            options={TIER_FILTERS.map((t) => ({ value: t.key, label: t.label }))}
            onChange={setTier}
          />
          {collapsible && (
            <button type="button" className="text-link" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
              {expanded ? 'Show top 5' : 'View full ranking'}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      {hero && <HeroEntry key={hero.influencer.handle} entry={hero} live={epoch.status === 'live'} />}

      {rows.length > 0 ? (
        <div className="rows" aria-label={`The SIIR ${entries.length}, epoch ${epoch.number}`}>
          <div className="row row--head" aria-hidden="true">
            <span>#</span>
            <span className="c-profile">
              Mind
            </span>
            <span className="c-tier">
              Tier
            </span>
            <span className="c-realm">
              Realm
            </span>
            <span className="c-score">
              SIIR Score
            </span>
            <span className="c-reach">
              Reach
            </span>
            <span className="c-change">
              Change
            </span>
            <span className="c-spark">
              Trend
            </span>
          </div>
          {rows.map((e, i) => (
            <Row key={e.influencer.handle} entry={e} index={i} />
          ))}
        </div>
      ) : (
        !hero && <p className="state">No minds match this filter this epoch.</p>
      )}
    </section>
  )
}

function HeroEntry({ entry, live }: { entry: Entry; live: boolean }) {
  const { influencer: p } = entry
  const delta = scoreDelta(entry.spark)
  return (
    <article className="hero-card">
      <div className="hero-card-rank" aria-label="Top of this list">
        <small>#</small>1
        {entry.rank !== 1 && <em className="overall">Overall #{entry.rank}</em>}
      </div>
      <div className="hero-body">
        <span className="tier-label">{TIER_LABEL[entry.tier].toUpperCase()}</span>
        <h3 className="hero-name">
          <Link href={`/seen/${p.handle}`}>{p.name}</Link>
        </h3>
        <p className="hero-handle">
          <Avatar handle={p.handle} name={p.name} size={26} src={p.avatarUrl} />
          @{p.handle} <RealmChip realm={p.realm} />
        </p>
        <p className="why">{p.why}</p>
        <Link href={`/seen/${p.handle}`} className="btn btn-outline">
          View Profile <ArrowRight size={14} />
        </Link>
      </div>
      <Link href={`/seen/${p.handle}`} className="hero-avatar" aria-label={`${p.name}, profile`}>
        <i className="halo" />
        <Art3D name="astronaut-left" className="hero-astronaut" eager />
        <i className="coin coin--a" />
        <i className="coin coin--b" />
        <i className="coin coin--c" />
      </Link>
      <aside className="score-panel">
        <span className="stat-label">
          SIIR SCORE {live && <span className="live-tag">LIVE</span>}
        </span>
        <div className="score-big">
          <b>{entry.score.toFixed(1)}</b>
          {delta !== 0 && (
            <span className={delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
              {delta > 0 ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)}
            </span>
          )}
        </div>
        <span className="stat-label">REALM</span>
        <span className="realm-bubbles">
          <RealmIcons realm={p.realm} size={20} />
        </span>
        <Sparkline values={entry.spark} width={190} height={48} />
      </aside>
    </article>
  )
}

function Row({ entry, index }: { entry: Entry; index: number }) {
  const { influencer: p } = entry
  return (
    <Link
      href={`/seen/${p.handle}`}
      className="row row--item"
     
      style={{ '--i': Math.min(index, 14) } as CSSProperties}
    >
      <span className="c-rank">
        {entry.rank}
      </span>
      <span className="c-profile">
        <Avatar handle={p.handle} name={p.name} size={44} src={p.avatarUrl} />
        <span className="profile-text">
          <strong>{p.name}</strong>
          <small>@{p.handle}</small>
          <span className="row-meta">
            <TierBadge tier={entry.tier} />
            <RealmIcons realm={p.realm} size={16} />
          </span>
        </span>
      </span>
      <span className="c-tier">
        <TierBadge tier={entry.tier} />
      </span>
      <span className="c-realm">
        <RealmIcons realm={p.realm} />
      </span>
      <span className="c-score">
        {entry.score.toFixed(1)}
      </span>
      <span className="c-reach">
        {compact(entry.reach)}
      </span>
      <span className="c-change">
        <Change value={entry.rankChange} isNew={entry.isNew} />
      </span>
      <span className="c-spark">
        <Sparkline values={entry.spark} width={110} height={30} />
      </span>
    </Link>
  )
}
