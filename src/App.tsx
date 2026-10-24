import type { CSSProperties } from 'react'
import { ArrowRight, LinkSimple } from '@phosphor-icons/react'
import { Art3D, Crystal, type Asset3D } from './components/Art'
import { Reveal, State } from './components/Bits'
import { RobinhoodIcon, SolanaIcon } from './components/Icons'
import { LazyBg } from './components/LazyBg'
import { RankingBoard } from './components/RankingBoard'
import { api, type Entry } from './lib/api'
import { TIER_LABEL } from './lib/format'
import { useAsync } from './lib/hooks'
import { Link } from './lib/router'

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

const TIERS = [
  ['singular', '#1'],
  ['oracle', '#2-5'],
  ['cortex', '#6-15'],
  ['synapse', '#16-25'],
  ['spark', '#26-33'],
] as const

function Hero({ minds, epoch }: { minds: number; epoch?: number }) {
  return (
    <section id="hero" className="hero">
      <p className="hero-side" aria-hidden="true">
        <span>SEE</span>
        <b>RANK</b>
        <span>UNDERSTAND</span>
        <span>THE NEXT</span>
        <span>WAVE</span>
      </p>
      <div className="hero-copy">
        <span className="eyebrow rise" style={d(0)}>
          THE SIIR {minds}
          {epoch ? ` · EPOCH ${epoch}` : ''}
        </span>
        <h1 className="hero-h1 rise" style={d(90)}>
          The minds
          <br />
          the market
          <em>hasn&apos;t seen yet.</em>
        </h1>
        <p className="hero-sub rise" style={d(180)}>
          A curated index of {minds} influential minds shaping the future of Web3, AI, and onchain culture across Solana and
          Robinhood Chain.
        </p>
        <div className="hero-actions rise" style={d(270)}>
          <Link href="/#ranking" className="btn btn-dark">
            Explore The SIIR {minds} <ArrowRight size={14} />
          </Link>
          <Link href="/about" className="btn btn-outline">
            About SIIR
          </Link>
        </div>
        <dl className="hero-stats-row rise" style={d(360)}>
          <div>
            <dd>{minds}</dd>
            <dt>Influential Minds</dt>
          </div>
          <div>
            <dd>2</dd>
            <dt>Onchain Realms</dt>
          </div>
          <div>
            <dd>1</dd>
            <dt>Signal Ahead</dt>
          </div>
        </dl>
      </div>
    </section>
  )
}

function Strip() {
  const items: [Asset3D, string][] = [
    ['icon-people', 'Social Signals'],
    ['icon-bars', 'Onchain Activity'],
    ['icon-doc', 'Narrative Analysis'],
    ['icon-eye', 'AI Insights'],
  ]
  return (
    <div className="strip">
      <div className="strip-inner">
        <div className="strip-group">
          <span className="strip-label">COVERING MINDS ACROSS</span>
          <span className="strip-chain">
            <SolanaIcon size={24} /> Solana
          </span>
          <span className="strip-chain">
            <RobinhoodIcon size={24} /> Robinhood Chain
          </span>
        </div>
        <div className="strip-group">
          <span className="strip-label">RANKED BY REAL DATA</span>
          {items.map(([art, label]) => (
            <span key={label} className="strip-item">
              <Art3D name={art} className="strip-icon" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function risers(entries: Entry[]): Entry[] {
  const fresh = entries.filter((e) => e.isNew).slice(0, 1)
  const up = entries
    .filter((e) => !e.isNew && (e.rankChange ?? 0) > 0)
    .sort((a, b) => (b.rankChange ?? 0) - (a.rankChange ?? 0))
    .slice(0, 3 - fresh.length)
  return [...up, ...fresh]
}

function Rising({ entries }: { entries: Entry[] }) {
  const list = risers(entries)
  if (!list.length) return null
  return (
    <LazyBg className="rising" id="rising">
      <div className="wrap">
        <Reveal className="rising-head">
          <div>
            <span className="eyebrow eyebrow--light">THIS EPOCH</span>
            <h2 className="section-title">Rising Minds</h2>
            <p className="section-dek">The biggest movers in this epoch. New narratives. New opportunities.</p>
          </div>
          <Link href="/#ranking" className="text-link text-link--light">
            View all risers <ArrowRight size={14} />
          </Link>
        </Reveal>
        <div className="rising-grid">
          {list.map((e, i) => (
            <Reveal key={e.influencer.handle} delay={i * 90}>
              <Link href={`/seen/${e.influencer.handle}`} className="rise-card">
                <span className="rise-tag">{e.isNew ? 'New Entry' : `↑ +${e.rankChange}`}</span>
                <strong>@{e.influencer.handle}</strong>
                <b>{e.score.toFixed(1)}</b>
                <Crystal variant={i} />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </LazyBg>
  )
}

function Realms() {
  return (
    <LazyBg className="section realms-stage" id="realms">
      <div className="wrap">
        <Reveal className="section-head section-head--left">
          <span className="eyebrow">INFLUENCE ACROSS CHAINS</span>
          <h2 className="section-title">
            Two Realms.
            <br />
            One Larger Truth.
          </h2>
          <p className="section-dek">Different cultures. One connected future.</p>
        </Reveal>
        <Reveal className="realms-grid">
          <div className="realm-card">
            <SolanaIcon size={34} />
            <h3>
              Realm of
              <br />
              Velocity
            </h3>
            <small>Solana</small>
            <p>Fast. Chaotic. Degen. Where new ideas are born.</p>
            <Link href="/#ranking" className="text-link">
              Explore Solana <ArrowRight size={14} />
            </Link>
          </div>
          <div className="realms-art">
            <p>
              BRIDGED MINDS <LinkSimple size={11} weight="bold" />
              <br />
              INFLUENCE BOTH REALMS
            </p>
          </div>
          <div className="realm-card realm-card--right">
            <RobinhoodIcon size={34} />
            <h3>
              Realm of
              <br />
              Ledger
            </h3>
            <small>Robinhood Chain</small>
            <p>Traditional finance onchain. Where real world meets Web3.</p>
            <Link href="/#ranking" className="text-link">
              Explore Robinhood Chain <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>
      </div>
    </LazyBg>
  )
}

function Method() {
  return (
    <section className="section section--tint" id="method">
      <div className="wrap method">
        <Reveal className="method-copy">
          <span className="eyebrow">A MULTI-LAYERED ANALYSIS</span>
          <h2 className="section-title">
            The Method
            <br />
            Behind the Signal.
          </h2>
          <span className="title-rule" aria-hidden="true" />
          <p className="section-dek">
            SIIR Score combines social influence, engagement quality, narrative lead, onchain footprint, and consistency across both
            realms.
          </p>
          <Link href="/methodology" className="text-link">
            View methodology <ArrowRight size={14} />
          </Link>
        </Reveal>
        <Reveal className="method-visual" delay={80}>
          <img
            src="/bg/method.webp"
            width={1405}
            height={1119}
            loading="lazy"
            decoding="async"
            alt="SIIR Score diagram: Social Signals, Engagement Quality, Narrative Lead, Onchain Footprint and Consistency arranged around the SIIR core."
          />
        </Reveal>
        <Reveal className="tiers-card" delay={160}>
          <h3>The Five Tiers</h3>
          <ul>
            {TIERS.map(([k, r]) => (
              <li key={k}>
                <i style={{ background: `var(--tier-${k})` }} />
                <span>{TIER_LABEL[k]}</span>
                <b>{r}</b>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

function Banner({ minds }: { minds: number }) {
  return (
    <LazyBg className="banner-wrap">
      <Reveal className="banner">
        <div className="banner-copy">
          <h2>
            SEE BEFORE
            <br />
            THE SIGNAL.
          </h2>
          <p>Join a growing community that follows the minds shaping what&apos;s next.</p>
        </div>
        <Link href="/#ranking" className="btn btn-dark">
          Explore The SIIR {minds} <ArrowRight size={14} />
        </Link>
      </Reveal>
    </LazyBg>
  )
}

export default function App() {
  const { data, loading, error } = useAsync(() => api.epoch('current'), [])
  const minds = data?.entries.length ?? 33
  return (
    <>
      <Hero minds={minds} epoch={data?.epoch.number} />
      <Strip />
      <div className="wrap wrap--board">
        <State loading={loading} error={error} />
        {data && (
          <RankingBoard
            board={data}
            collapsible
            title="Today's Ranking"
            dek={`${minds} minds shaping the conversation across Solana and Robinhood Chain. Updated every epoch.`}
          />
        )}
      </div>
      {data && <Rising entries={data.entries} />}
      <Realms />
      <Method />
      <Banner minds={minds} />
    </>
  )
}
