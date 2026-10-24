import { Avatar, RealmChip, Reveal, State } from '../components/Bits'
import { FxHeading, PageHero } from '../components/Page'
import { api } from '../lib/api'
import { useAsync, usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'

export function CandidatesView() {
  usePageMeta('Candidates - SIIR', 'Minds on the Seer radar that are not ranked yet. Only the on-chain component is measured so far.', { noindex: true })
  const { data, loading, error } = useAsync(() => api.candidates(), [])

  return (
    <>
      <PageHero
        bg="home"
        crumbs={[{ label: 'Candidates' }]}
        eyebrow="ON THE RADAR"
        title={
          <>
            Not ranked yet,
            <em> already watched.</em>
          </>
        }
        dek="Candidates are minds with a wallet on record. Only the on-chain component is measured so far, so none of them has a SIIR Score."
        ticker={data ? [`${data.length} candidates`, 'On-chain only', 'Wallets unverified'] : ['Loading candidates']}
      />

      <div className="pg">
        <State loading={loading} error={error} />
        {data && (
          <Reveal>
            <FxHeading index="CANDIDATES">By on-chain strength</FxHeading>
            <ul className="cand-grid">
              {data.map((c) => (
                <li key={c.handle}>
                  <a className="cand-card" href={`https://x.com/${c.handle}`} target="_blank" rel="noopener noreferrer">
                    <Avatar handle={c.handle} name={c.name} size={64} src={c.avatarUrl} />
                    <span className="cand-who">
                      <strong>{c.name}</strong>
                      <small>@{c.handle}</small>
                    </span>
                    <RealmChip realm={c.realm} />
                    <span className="cand-meter" role="img" aria-label={`On-chain ${c.onchain.toFixed(0)} out of 100`}>
                      <i style={{ width: `${Math.min(100, c.onchain)}%` }} />
                    </span>
                    <span className="cand-foot">
                      <b>{c.onchain.toFixed(0)}</b> on-chain
                      <em>{c.wallets.some((w) => w.verified) ? 'Verified' : 'Unverified'}</em>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="cand-note">
              Know one of them? They can claim the profile and prove the wallet by signing in the <Link href="/nominate">nomination form</Link>.
            </p>
          </Reveal>
        )}
      </div>
    </>
  )
}
