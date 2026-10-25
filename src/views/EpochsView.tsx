import { ArrowRight } from '@phosphor-icons/react'
import { Art3D } from '../components/Art'
import { Avatar, Reveal, State } from '../components/Bits'
import { CountUp, FxHeading, PageHero } from '../components/Page'
import { RankingBoard } from '../components/RankingBoard'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAsync, usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'

export function EpochsView() {
  usePageMeta('Past Epochs - SIIR', 'Every edition of The SIIR 33, archived by epoch.')
  const { data, loading, error } = useAsync(() => api.epochs(), [])
  const live = data?.find((e) => e.status === 'live')

  return (
    <>
      <PageHero
        bg="banner"
        crumbs={[{ label: 'Epochs' }]}
        eyebrow="ARCHIVE"
        title={
          <>
            Every edition,
            <em> frozen.</em>
          </>
        }
        dek="Each epoch is a snapshot of The SIIR 33 at the moment it closed. Open one to see who was Seen then."
        art={<Art3D name="chart" className="phero-3d" eager />}
        ticker={data ? [`${data.length} epochs archived`, live ? `Epoch ${live.number} is live` : 'No live epoch'] : ['Loading the archive']}
      />

      <div className="pg">
        <State loading={loading} error={error} />
        {data && data.length === 0 && <p className="state">No epoch has been published yet.</p>}
        {data && data.length > 0 && (
          <Reveal>
            <FxHeading index="TIMELINE">Newest first</FxHeading>
            <ol className="timeline">
              {data.map((e) => (
                <li key={e.number} className={e.status === 'live' ? 'tl-item is-live' : 'tl-item'}>
                  <span className="tl-node" aria-hidden="true" />
                  <Link href={`/epochs/${e.number}`} className="fx-card tl-card">
                    <span className="tl-no">
                      <CountUp to={e.number} duration={700} />
                    </span>
                    <span className="tl-meta">
                      <span className={e.status === 'live' ? 'tl-status tl-status--live' : 'tl-status'}>{e.status === 'live' ? 'Live now' : 'Final'}</span>
                      <small className="mono">
                        {formatDate(e.startsAt)} to {formatDate(e.endsAt)}
                      </small>
                    </span>
                    {e.singular && (
                      <span className="tl-top">
                        <Avatar handle={e.singular.handle} name={e.singular.name} size={44} src={e.singular.avatarUrl} />
                        <span>
                          <small>Singular</small>
                          <strong>{e.singular.name}</strong>
                        </span>
                        <b className="mono">{e.singular.score.toFixed(1)}</b>
                      </span>
                    )}
                    <span className="tl-open">
                      Open edition <ArrowRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Reveal>
        )}
      </div>
    </>
  )
}

export function EpochDetailView({ number }: { number: string }) {
  const { data, loading, error } = useAsync(() => api.epoch(number), [number])
  usePageMeta(`Epoch ${number} - SIIR`, `The SIIR 33, epoch ${number}.`)

  return (
    <>
      <PageHero
        bg="banner"
        crumbs={[{ label: 'Epochs', href: '/epochs' }, { label: `Epoch ${number}` }]}
        eyebrow={data?.epoch.status === 'live' ? 'LIVE EDITION' : 'FROZEN EDITION'}
        title={
          <>
            Epoch <em>{number}</em>
          </>
        }
        dek={data ? `${formatDate(data.epoch.startsAt)} to ${formatDate(data.epoch.endsAt)}. ${data.entries.length} minds were Seen.` : undefined}
        ticker={data ? [data.epoch.status === 'live' ? 'Still updating' : 'Closed', `${data.entries.length} minds`] : undefined}
      />
      <div className="pg pg--wide">
        <State loading={loading} error={error} />
        {data && (
          <RankingBoard
            board={data}
            bare
            title={`The SIIR ${data.entries.length}, Epoch ${data.epoch.number}`}
            dek=""
          />
        )}
        <Link href="/epochs" className="back">
          ← All epochs
        </Link>
      </div>
    </>
  )
}
