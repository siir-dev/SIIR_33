import { useEffect, useState } from 'react'
import { CaretDown, List, X, XLogo } from '@phosphor-icons/react'
import { Link } from '../lib/router'
import { Logo } from './Logo'
import { RobinhoodIcon, SolanaIcon } from './Icons'

const LINKS = [
  { href: '/', label: 'The SIIR 33' },
  { href: '/epochs', label: 'Epochs' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
]

export function Navbar({ path }: { path: string }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const active = (href: string) => (href === '/' ? path === '/' || path.startsWith('/seen') : path.startsWith(href))

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${path === '/methodology' ? 'nav--solid' : ''}`}>
      <nav className="nav-inner" aria-label="Primary">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            <Logo />
          </Link>
          <div className="nav-links">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link ${active(l.href) ? 'is-active' : ''}`} aria-current={active(l.href) ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="nav-actions">
          <span className="nav-chains" title="Indexed realms">
            <SolanaIcon size={16} />
            <span>Solana</span>
            <i aria-hidden="true" />
            <RobinhoodIcon size={16} />
            <span>Robinhood Chain</span>
            <CaretDown size={12} weight="bold" />
          </span>
          <a className="icon-btn nav-x" href="https://x.com/SIIR33Index" target="_blank" rel="noreferrer" aria-label="SIIR on X">
            <XLogo size={16} weight="bold" />
          </a>
          <Link href="/nominate" className="btn btn-dark nav-cta">
            Nominate a Mind
          </Link>
          <button
            type="button"
            className="icon-btn nav-burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} /> : <List size={18} />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="nav-sheet">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-sheet-link">
              {l.label}
            </Link>
          ))}
          <a className="nav-sheet-link" href="https://x.com/SIIR33Index" target="_blank" rel="noreferrer">
            SIIR on X
          </a>
          <Link href="/nominate" className="btn btn-dark">
            Nominate a Mind
          </Link>
        </div>
      )}
    </header>
  )
}
