import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, MagnifyingGlass } from '@phosphor-icons/react'
import type { Entry, EpochBoard, Realm } from '../lib/api'
import { TIER_LABEL } from '../lib/format'
import { Link } from '../lib/router'
import { Avatar, Change, Sparkline } from './Bits'
import { RealmIcons } from './Icons'
import { scoreDelta } from './RankingBoard'

type RealmFilter = 'all' | Realm
const FILTERS: { key: RealmFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'velocity', label: 'Solana' },
  { key: 'ledger', label: 'Robinhood Chain' },
  { key: 'bridged', label: 'Bridged' },
]

function Spotlight({ entry, live }: { entry: Entry; live: boolean }) {
  const { influencer: p } = entry
  const delta = scoreDelta(entry.spark)
  return (
    <article className="spot">
      <img className="spot-img" src="/home/portrait.webp" width={708} height={496} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <div className="spot-top">
        <span className="spot-chip spot-chip--rank">#{entry.rank}</span>
        <span className="spot-chip spot-chip--tier">{TIER_LABEL[entry.tier].toUpperCase()}</span>
      </div>
      <div className="spot-score">
        <small>SIIR SCORE {live && <b>LIVE</b>}</small>
        <strong>{entry.score.toFixed(1)}</strong>
        {delta !== 0 && (
          <span className={delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
            {delta > 0 ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
            {Math.abs(delta).toFixed(0)}
          </span>
        )}
        <Sparkline values={entry.spark} width={150} height={40} />
      </div>
      <div className="spot-body">
        <h3>
          <Link href={`/seen/${p.handle}`}>{p.name}</Link>
        </h3>
        <p className="spot-handle">@{p.handle}</p>
        <p className="spot-why">{p.why}</p>
        <span className="spot-realm">
          <RealmIcons realm={p.realm} size={22} />
          {p.realm === 'bridged' && <em>Bridged</em>}
        </span>
      </div>
      <Link href={`/seen/${p.handle}`} className="btn btn-blue spot-cta">
        View Profile <ArrowRight size={14} />
      </Link>
    </article>
  )
}

function MiniRow({ entry }: { entry: Entry }) {
  const { influencer: p } = entry
  return (
    <Link href={`/seen/${p.handle}`} className="mini">
      <span className="mini-rank">{entry.rank}</span>
      <Avatar handle={p.handle} name={p.name} size={38} />
      <span className="mini-who">
        <strong>{p.name}</strong>
        <small>@{p.handle}</small>
      </span>
      <b className="mini-score">{entry.score.toFixed(1)}</b>
      <Change value={entry.rankChange} isNew={entry.isNew} />
      <span className="mini-spark">
        <Sparkline values={entry.spark} width={78} height={26} />
      </span>
    </Link>
  )
}

/** Home preview: the top mind in a spotlight card, ranks below it in a compact list. Full table lives on the epoch page. */
export function HomeBoard({ board }: { board: EpochBoard }) {
  const [realm, setRealm] = useState<RealmFilter>('all')
  const [query, setQuery] = useState('')
  const { epoch, entries } = board

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '')
    return entries.filter(
      (e) =>
        (realm === 'all' || e.influencer.realm === realm) &&
        (!q || e.influencer.name.toLowerCase().includes(q) || e.influencer.handle.toLowerCase().includes(q)),
    )
  }, [entries, realm, query])
  const [top, ...rest] = filtered
  const list = rest.slice(0, 4)

  return (
    <section id="ranking" className="hb">
      <header className="hb-head">
        <div>
          <span className="eyebrow">EPOCH {epoch.number}</span>
          <h2 className="hb-title">The SIIR {entries.length}</h2>
          <p className="hb-dek">This epoch&apos;s ranking of the most influential minds in Web3.</p>
        </div>
        <div className="hb-tools">
          <div className="seg" role="group" aria-label="Filter by realm">
            {FILTERS.map((f) => (
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
          <label className="search">
            <span className="sr-only">Search minds</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search minds, handles" autoComplete="off" />
            <MagnifyingGlass size={16} aria-hidden="true" />
          </label>
        </div>
      </header>

      {top ? (
        <div className="hb-grid">
          <Spotlight entry={top} live={epoch.status === 'live'} />
          <div className="hb-list">
            {list.map((e) => (
              <MiniRow key={e.influencer.handle} entry={e} />
            ))}
            {list.length === 0 && <p className="state">No other minds match.</p>}
            <Link href={`/epochs/${epoch.number}`} className="hb-all">
              View Full Ranking <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <p className="state">No minds match this search.</p>
      )}
    </section>
  )
}
