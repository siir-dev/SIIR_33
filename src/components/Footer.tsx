import { useState, type FormEvent } from 'react'
import { ArrowRight, XLogo } from '@phosphor-icons/react'
import { api } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { friendlyError } from '../lib/errors'
import { Link } from '../lib/router'
import { Logo } from './Logo'

function Subscribe() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await api.subscribe(email)
      setStatus('done')
    } catch (err) {
      setError(friendlyError(err, 'Could not subscribe. Try again in a moment.'))
      setStatus('idle')
    }
  }

  if (status === 'done') return <p className="subscribe-done">You&apos;re on the list. New rankings arrive every epoch.</p>

  return (
    <form className="subscribe" onSubmit={submit}>
      <label className="sr-only" htmlFor="subscribe-email">
        Email address
      </label>
      <input
        id="subscribe-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        autoComplete="email"
      />
      <button type="submit" aria-label="Subscribe" disabled={status === 'sending'}>
        <ArrowRight size={16} weight="bold" />
      </button>
      {error && (
        <p className="subscribe-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export function Footer() {
  const { data } = useAsync(() => api.epoch('current'), [])
  return (
    <footer className="footer footer--hud">
      <span className="footer-word" aria-hidden="true">
        SIIR
      </span>
      <span className="footer-beam" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <Logo />
          </span>
          <p className="footer-tag">The minds the market hasn&apos;t seen yet.</p>
          <a className="icon-btn footer-x" href="https://x.com/SIIR33Index" target="_blank" rel="noreferrer" aria-label="SIIR on X">
            <XLogo size={16} weight="bold" />
          </a>
        </div>
        <nav className="footer-cols" aria-label="Footer">
          <div>
            <h3>Explore</h3>
            <Link href="/">The SIIR 33</Link>
            <Link href="/epochs">Epochs</Link>
            <Link href="/candidates">Candidates</Link>
          </div>
          <div>
            <h3>Understand</h3>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about">About</Link>
          </div>
          <div>
            <h3>Take part</h3>
            <Link href="/nominate">Nominate a mind</Link>
            <a href="https://x.com/SIIR33Index" target="_blank" rel="noreferrer">
              Follow on X
            </a>
          </div>
        </nav>
        <div className="footer-follow">
          {data && (
            <p className="footer-live">
              <i aria-hidden="true" />
              EPOCH {data.epoch.number} · {data.epoch.status === 'live' ? 'LIVE' : 'FINAL'} · {data.entries.length} MINDS
            </p>
          )}
          <h2>New rankings every epoch</h2>
          <Subscribe />
        </div>
      </div>
      <p className="footer-bar">
        Not investment advice. Nobody pays to enter the list. Scores come from public data. Candidates are not ranked until their score is complete. © 2026 SIIR, formerly Ordinal.
      </p>
    </footer>
  )
}
