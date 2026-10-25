import type { CSSProperties } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Avatar, RealmChip, Reveal, State } from './components/Bits'
import { HomeBoard } from './components/HomeBoard'
import { RobinhoodIcon, SolanaIcon } from './components/Icons'
import { api, type Entry } from './lib/api'
import { useAsync } from './lib/hooks'
import { Link } from './lib/router'

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

const TIERS = [
  ['Singular', 'The top mind of this epoch.'],
  ['Oracle', 'Shapes the narrative, not follows it.'],
  ['Cortex', 'Consistent influence across chains.'],
  ['Synapse', 'Rising minds with stronger signals.'],
  ['Spark', 'New to the radar of the Seer.'],
]

const SIGNALS = [
  { img: 'sig-1', tag: 'METHOD', title: 'How the SIIR Score is built from five components', foot: 'Methodology', href: '/methodology' },
  { img: 'sig-2', tag: 'REALMS', title: 'Two realms, one index: Solana and Robinhood Chain', foot: 'About SIIR', href: '/about' },
  { img: 'sig-3', tag: 'ARCHIVE', title: 'Every edition of The SIIR 33, frozen by epoch', foot: 'Past epochs', href: '/epochs' },
]

function Hero({ entries, epoch }: { entries: Entry[]; epoch?: number }) {
  return (
    <section id="hero" className="home-hero">
      <div className="home-hero-copy">
        <span className="eyebrow rise" style={d(0)}>
          SUPER INTELLIGENCE INFLUENCER RANK
        </span>
        <h1 className="home-h1 rise" style={d(90)}>
          The minds
          <br />
          the market
          <em>hasn&apos;t seen yet.</em>
        </h1>
        <p className="home-sub rise" style={d(180)}>
          {entries.length || 33} influencers shaping the next wave of Web3 across Solana and Robinhood Chain.
        </p>
        <div className="home-actions rise" style={d(270)}>
          <Link href="/#ranking" className="btn btn-blue">
            Explore The SIIR {entries.length || 33} <ArrowRight size={14} />
          </Link>
          <Link href="/methodology" className="btn btn-light">
            View Methodology
          </Link>
        </div>
        <p className="home-proof rise" style={d(360)}>
          <span className="stack">
            {entries.slice(0, 4).map((e) => (
              <Avatar key={e.influencer.handle} handle={e.influencer.handle} name={e.influencer.name} size={34} src={e.influencer.avatarUrl} />
            ))}
          </span>
          UPDATED EVERY EPOCH{epoch ? ` · EPOCH ${epoch}` : ''}
        </p>
      </div>
    </section>
  )
}

function Stats({ minds }: { minds: number }) {
  const items: [string, string, string][] = [
    [String(minds), 'MINDS', 'Ranked every epoch'],
    ['2', 'REALMS', 'Solana and Robinhood Chain'],
    ['5', 'TIERS', 'From Spark to Singular'],
    ['1', 'INDEX', 'To see the next wave early'],
  ]
  return (
    <dl className="home-stats">
      {items.map(([n, k, t]) => (
        <div key={k}>
          <dd>{n}</dd>
          <dt>
            <b>{k}</b>
            <span>{t}</span>
          </dt>
        </div>
      ))}
    </dl>
  )
}

function Radar() {
  const { data } = useAsync(() => api.candidates(), [])
  if (!data || data.length === 0) return null
  return (
    <section className="hs" id="radar">
      <Reveal className="hs-head">
        <div>
          <span className="eyebrow">ON THE RADAR</span>
          <h2 className="hs-title">Not ranked yet, already watched.</h2>
        </div>
        <Link href="/candidates" className="text-link">
          See all {data.length} candidates <ArrowRight size={14} />
        </Link>
      </Reveal>
      <ul className="radar-row">
        {data.slice(0, 12).map((c, i) => (
          <li key={c.handle}>
            <Reveal delay={(i % 6) * 40} className="radar-card">
              <Avatar handle={c.handle} name={c.name} size={72} src={c.avatarUrl} />
              <strong>{c.name}</strong>
              <small>@{c.handle}</small>
              <RealmChip realm={c.realm} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Realms() {
  return (
    <section className="hs hs-realms" id="realms">
      <Reveal className="hs-copy">
        <span className="eyebrow">TWO REALMS, ONE OBSERVATION</span>
        <h2 className="hs-title">
          Across chains.
          <br />
          Beyond noise.
        </h2>
        <p>SIIR tracks the thinkers, builders, and degen-driven voices who shape narratives before they become obvious.</p>
        <Link href="/about" className="text-link">
          Learn about the realms <ArrowRight size={14} />
        </Link>
      </Reveal>
      <Reveal className="realm-tiles" delay={80}>
        <Link href="/#ranking" className="realm-tile">
          <img src="/home/city-violet.webp" width={708} height={494} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <span className="realm-tile-copy">
            <SolanaIcon size={26} />
            <b>SOLANA</b>
            <small>Realm of Velocity</small>
            <p>Fast, open, and degen-driven innovation.</p>
          </span>
        </Link>
        <Link href="/#ranking" className="realm-tile">
          <img src="/home/city-green.webp" width={712} height={494} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <span className="realm-tile-copy">
            <RobinhoodIcon size={26} />
            <b>ROBINHOOD CHAIN</b>
            <small>Realm of Ledger</small>
            <p>Traditional finance meets on-chain intelligence.</p>
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

function Tiers() {
  return (
    <section className="hs" id="tiers">
      <Reveal className="hs-head">
        <div>
          <span className="eyebrow">FIVE TIERS, ONE INDEX</span>
          <h2 className="hs-title">From spark to singular.</h2>
        </div>
        <Link href="/about" className="text-link">
          Learn about the tiers <ArrowRight size={14} />
        </Link>
      </Reveal>
      <ol className="tier-row">
        {TIERS.map(([name, text], i) => (
          <li key={name}>
            <Reveal delay={i * 60} className="tier-tile">
              <span className="tier-no">
                <b>{String(i + 1).padStart(2, '0')}</b>
                {name}
              </span>
              <img src={`/home/tier-${i + 1}.webp`} width={268} height={456} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              <p>{text}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Signals() {
  return (
    <section className="hs" id="signals">
      <Reveal className="hs-head">
        <div>
          <span className="eyebrow">FROM THE OBSERVATORY</span>
          <h2 className="hs-title">Latest Signals</h2>
        </div>
        <Link href="/methodology" className="text-link">
          Read the method <ArrowRight size={14} />
        </Link>
      </Reveal>
      <ul className="sig-row">
        {SIGNALS.map((s, i) => (
          <li key={s.tag}>
            <Reveal delay={i * 70} className="sig-wrap">
              <Link href={s.href} className="sig-card">
                <img src={`/home/${s.img}.webp`} width={448} height={360} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                <span className="sig-body">
                  <small>{s.tag}</small>
                  <strong>{s.title}</strong>
                  <span className="sig-foot">
                    {s.foot} <ArrowRight size={14} />
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Cta() {
  return (
    <section className="hs" id="nominate">
      <Reveal className="cta2">
        <img src="/home/cta.webp" width={1436} height={528} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div className="cta2-copy">
          <span className="eyebrow">JOIN THE OBSERVATION</span>
          <h2 className="hs-title">Nominate a mind.</h2>
          <p>Know someone who should be on The SIIR 33? Submit a nomination and help the Seer find the next wave.</p>
          <div className="home-actions">
            <Link href="/nominate" className="btn btn-blue">
              Nominate Now <ArrowRight size={14} />
            </Link>
            <Link href="/about" className="btn btn-light">
              Learn more about SIIR
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default function App() {
  const { data, loading, error } = useAsync(() => api.epoch('current'), [])
  const minds = data?.entries.length ?? 33
  return (
    <>
      <Hero entries={data?.entries ?? []} epoch={data?.epoch.number} />
      <Stats minds={minds} />
      <div className="hs">
        {error === 'Epoch not found' ? (
          <p className="state">The first epoch has not been published yet. The minds below are already on the radar.</p>
        ) : (
          <State loading={loading} error={error} />
        )}
        {data && <HomeBoard board={data} />}
      </div>
      <Radar />
      <Realms />
      <Tiers />
      <Signals />
      <Cta />
    </>
  )
}
