import { useMemo, useState, type CSSProperties } from 'react'
import { Art3D, type Asset3D } from '../components/Art'
import { Reveal, ScoreGauge, State, TierBadge } from '../components/Bits'
import { CountUp, FxHeading, PageHero } from '../components/Page'
import { api, type Methodology } from '../lib/api'
import { useAsync, usePageMeta } from '../lib/hooks'

const ICON: Record<string, Asset3D> = {
  reach: 'icon-people',
  engagement: 'icon-bars',
  narrative: 'icon-doc',
  onchain: 'icon-eye',
  consistency: 'icon-bars',
}

/** The real formula, live. Drag a component and the score moves exactly as it would in an epoch. */
function ScoreLab({ data }: { data: Methodology }) {
  const [values, setValues] = useState<Record<string, number>>({ reach: 92, engagement: 84, narrative: 88, onchain: 76, consistency: 62 })
  const score = useMemo(() => data.weights.reduce((sum, w) => sum + w.weight * (values[w.key] ?? 0), 0), [data.weights, values])
  const counts = score >= data.thresholds.consistencyScore

  return (
    <div className="lab">
      <div className="lab-console">
        <p className="lab-formula">
          <span className="tok tok--k">SIIR</span> <span className="tok">=</span> <span className="tok">100</span> <span className="tok">×</span>{' '}
          <span className="tok tok--k">Σ</span> <span className="tok tok--w">wᵢ</span> <span className="tok">·</span> <span className="tok tok--n">norm(xᵢ)</span>
        </p>
        <ul className="lab-sliders">
          {data.weights.map((w) => (
            <li key={w.key}>
              <label htmlFor={`lab-${w.key}`}>
                <span>{w.label}</span>
                <small className="mono">w {w.weight.toFixed(2)}</small>
              </label>
              <input
                id={`lab-${w.key}`}
                type="range"
                min={0}
                max={100}
                value={values[w.key]}
                onChange={(e) => setValues({ ...values, [w.key]: Number(e.target.value) })}
                style={{ '--fill': `${values[w.key]}%` } as CSSProperties}
              />
              <b className="mono">{values[w.key]}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="lab-out">
        <ScoreGauge score={Math.round(score * 10) / 10} size={190} />
        <p className={counts ? 'lab-flag is-on' : 'lab-flag'}>
          {counts ? 'Counts toward Consistency' : `Below the ${data.thresholds.consistencyScore} line for Consistency`}
        </p>
        <p className="lab-hint">A sandbox, not a ranking. Real components are measured, not typed in.</p>
      </div>
    </div>
  )
}

export function MethodologyView() {
  usePageMeta('Methodology - SIIR', 'How the SIIR Score is calculated: five weighted components, recalculated every epoch.')
  const { data, loading, error } = useAsync(() => api.methodology(), [])

  return (
    <>
      <PageHero
        tone="night"
        bg="rising"
        crumbs={[{ label: 'Methodology' }]}
        eyebrow="THE OBSERVATORY"
        title={
          <>
            How the Seer
            <em> scores.</em>
          </>
        }
        dek="A number from 0 to 100, recalculated every epoch from five measurable components. Weights are proposals until they are signed off before launch."
        art={<Art3D name="orb" className="phero-3d" eager />}
        ticker={
          data
            ? [`${data.listSize} minds per epoch`, `Consistency from ${data.thresholds.consistencyScore}`, `Bridged from ${Math.round(data.thresholds.bridgedOnchain * 100)}% on both chains`]
            : ['Five components', 'One formula']
        }
      />

      <div className="pg">
        <State loading={loading} error={error} />
        {data && (
          <>
            <Reveal>
              <FxHeading index="01">The formula, live</FxHeading>
              <ScoreLab data={data} />
              <p className="pg-note">Each component xᵢ is normalised to 0 to 1, multiplied by its weight wᵢ, and summed.</p>
            </Reveal>

            <Reveal>
              <FxHeading index="02">Components</FxHeading>
              <ul className="mc-grid">
                {data.weights.map((w, i) => {
                  const rule = data.normalisation.find((n) => n.key === w.key)?.rule
                  return (
                    <li key={w.key} className="fx-card mc" style={{ '--i': i } as CSSProperties}>
                      <span className="mc-icon">
                        <Art3D name={ICON[w.key] ?? 'icon-eye'} />
                      </span>
                      <div className="mc-weight">
                        <CountUp to={w.weight * 100} suffix="%" />
                      </div>
                      <h3>{w.label}</h3>
                      <p>{w.measures}</p>
                      {rule && <p className="mc-rule">{rule}</p>}
                    </li>
                  )
                })}
              </ul>
            </Reveal>

            <Reveal className="diagram">
              <img src="/bg/method.webp" width={1040} height={828} loading="lazy" decoding="async" alt="Social signals, engagement quality, narrative lead, onchain footprint and consistency feed the SIIR core." />
            </Reveal>

            <Reveal>
              <FxHeading index="03">Ranking rules</FxHeading>
              <ol className="steps">
                {data.rules.map((r, i) => (
                  <li key={r}>
                    <b className="mono">{String(i + 1).padStart(2, '0')}</b>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal>
              <FxHeading index="04">Where the data comes from</FxHeading>
              <ul className="src-grid">
                {data.sources.map((x) => (
                  <li key={x.label} className="fx-card">
                    <strong>{x.label}</strong>
                    <p>{x.source}</p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <FxHeading index="05">Tiers</FxHeading>
              <ul className="tier-chips">
                {data.tiers.map((t) => (
                  <li key={t.key}>
                    <TierBadge tier={t.key} />
                    <b className="mono">{t.ranks}</b>
                    <span>{t.meaning}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="disclaimer">
              <FxHeading>Disclaimer</FxHeading>
              <p>{data.disclaimer}</p>
            </Reveal>
          </>
        )}
      </div>
    </>
  )
}
