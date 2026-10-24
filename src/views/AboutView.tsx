import type { CSSProperties } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Reveal } from '../components/Bits'
import { RobinhoodIcon, SolanaIcon } from '../components/Icons'
import { FxHeading, PageHero } from '../components/Page'
import { usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'

const TIERS = [
  ['singular', 'Singular', '#1', 'The single top mind of this epoch'],
  ['oracle', 'Oracle', '#2-5', 'Shapes the narrative instead of following it'],
  ['cortex', 'Cortex', '#6-15', 'Consistent influence across chains'],
  ['synapse', 'Synapse', '#16-25', 'Rising, signal strengthening'],
  ['spark', 'Spark', '#26-33', 'Newly on the Seer radar'],
] as const

export function AboutView() {
  usePageMeta('About - SIIR', 'SIIR, read as "seer": the Super Intelligence Influencer Rank for Solana and Robinhood Chain.')
  return (
    <>
      <PageHero
        bg="home"
        crumbs={[{ label: 'About' }]}
        eyebrow="THE SEER"
        title={
          <>
            Seen before
            <em> the signal.</em>
          </>
        }
        dek="SIIR reads the minds that move Solana and Robinhood Chain, and records them before the timeline notices."
        ticker={['Super Intelligence Influencer Rank', 'Read as "seer"', 'Ranked every epoch']}
      />

      <div className="pg">
        <Reveal className="lore">
          <FxHeading index="01">Lore</FxHeading>
          <p className="lore-text">
            In the noise of Solana and Robinhood Chain, a few minds move faster than the market. SIIR watches them every epoch,
            records the ones who rise, and lets the dimming ones go.
          </p>
          <div className="lore-terms">
            <div>
              <b>Seen</b>
              <span>A mind recorded in the current list.</span>
            </div>
            <div>
              <b>Decohered</b>
              <span>A mind that fell out of the top 33. The profile stays, marked Previously Seen.</span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FxHeading index="02">Five tiers</FxHeading>
          <ol className="ladder">
            {TIERS.map(([key, label, ranks, meaning], i) => (
              <li key={key} className="ladder-step" style={{ '--tier': `var(--tier-${key})`, '--lift': `${(4 - i) * 14}px` } as CSSProperties}>
                <span className="ladder-rank">{ranks}</span>
                <strong>{label}</strong>
                <p>{meaning}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal>
          <FxHeading index="03">Two realms</FxHeading>
          <div className="realm-duo">
            <article className="fx-card realm-panel">
              <SolanaIcon size={34} />
              <h3>Realm of Velocity</h3>
              <small>Solana</small>
              <p>Fast, chaotic, degen. Narratives are born and die inside a single epoch.</p>
            </article>
            <div className="bridge" aria-hidden="true">
              <span>Bridged</span>
            </div>
            <article className="fx-card realm-panel">
              <RobinhoodIcon size={34} />
              <h3>Realm of Ledger</h3>
              <small>Robinhood Chain</small>
              <p>Old finance brought on-chain. Slower tape, heavier hands, longer memory.</p>
            </article>
          </div>
          <p className="pg-note">A mind that is strong in both realms earns the Bridged badge.</p>
        </Reveal>

        <Reveal className="pg-cta">
          <div>
            <h2>See how the score is built.</h2>
            <p>Five components, one formula, and a human editor at the gate.</p>
          </div>
          <div className="pg-cta-actions">
            <Link href="/methodology" className="btn btn-dark">
              Methodology <ArrowRight size={14} />
            </Link>
            <Link href="/nominate" className="btn btn-outline">
              Nominate a mind
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  )
}
