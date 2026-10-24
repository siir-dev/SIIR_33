import { Art3D } from '../components/Art'
import { PageHero } from '../components/Page'
import { usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'

export function NotFoundView() {
  usePageMeta('Not found - SIIR', 'This page is not on the Seer radar.', { noindex: true })
  return (
    <>
      <PageHero
        bg="hero"
        crumbs={[{ label: '404' }]}
        eyebrow="SIGNAL LOST"
        title={
          <>
            Not on
            <em> the radar.</em>
          </>
        }
        dek="The Seer has no record of this page."
        art={<Art3D name="astronaut-right" className="phero-3d" eager />}
        ticker={['Error 404', 'Nothing Seen here']}
      >
        <Link href="/" className="btn btn-dark">
          Back to The SIIR 33
        </Link>
      </PageHero>
      <div className="pg pg--empty" />
    </>
  )
}
