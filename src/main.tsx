import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens.css'
import './index.css'
import './pages.css'
import './home.css'
import App from './App.tsx'
import { Footer } from './components/Footer.tsx'
import { Navbar } from './components/Navbar.tsx'
import { usePageMeta } from './lib/hooks.ts'
import { usePath } from './lib/router.tsx'

const AboutView = lazy(() => import('./views/AboutView.tsx').then((m) => ({ default: m.AboutView })))
const MethodologyView = lazy(() => import('./views/MethodologyView.tsx').then((m) => ({ default: m.MethodologyView })))
const NominateView = lazy(() => import('./views/NominateView.tsx').then((m) => ({ default: m.NominateView })))
const CandidatesView = lazy(() => import('./views/CandidatesView.tsx').then((m) => ({ default: m.CandidatesView })))
const NotFoundView = lazy(() => import('./views/NotFoundView.tsx').then((m) => ({ default: m.NotFoundView })))
const ProfileView = lazy(() => import('./views/ProfileView.tsx').then((m) => ({ default: m.ProfileView })))
const EpochsView = lazy(() => import('./views/EpochsView.tsx').then((m) => ({ default: m.EpochsView })))
const EpochDetailView = lazy(() => import('./views/EpochsView.tsx').then((m) => ({ default: m.EpochDetailView })))

function Home() {
  usePageMeta(
    'SIIR - The Super Intelligence Influencer Rank',
    "The minds the market hasn't seen yet. Ranked every epoch across Solana and Robinhood Chain.",
  )
  return <App />
}

function Routes({ path }: { path: string }) {
  if (path === '/') return <Home />
  if (path === '/methodology') return <MethodologyView />
  if (path === '/epochs') return <EpochsView />
  if (path.startsWith('/epochs/')) return <EpochDetailView number={path.slice('/epochs/'.length)} />
  if (path === '/about') return <AboutView />
  if (path === '/nominate') return <NominateView />
  if (path === '/candidates') return <CandidatesView />
  if (path.startsWith('/seen/')) return <ProfileView handle={decodeURIComponent(path.slice('/seen/'.length))} />
  return <NotFoundView />
}

function MainRouter() {
  const path = usePath()
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Navbar path={path} />
      <div className="sheet">
        <main id="main">
          <Suspense fallback={<div className="wrap page"><div className="skeleton" aria-busy="true"><i /><i /><i /></div></div>}>
            <Routes path={path} />
          </Suspense>
        </main>
      </div>
      <Footer />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainRouter />
  </StrictMode>,
)
