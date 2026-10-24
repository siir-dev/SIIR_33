import { useState, type FormEvent } from 'react'
import { ArrowRight, XLogo } from '@phosphor-icons/react'
import { api } from '../lib/api'
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
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tag">The minds the market hasn&apos;t seen yet.</p>
          <a className="icon-btn" href="https://x.com/SIIR33Index" target="_blank" rel="noreferrer" aria-label="SIIR on X">
            <XLogo size={16} weight="bold" />
          </a>
        </div>
        <nav className="footer-cols" aria-label="Footer">
          <Link href="/">The SIIR 33</Link>
          <Link href="/epochs">Epochs</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/about">About</Link>
          <Link href="/nominate">Nominate</Link>
          <Link href="/candidates">Candidates</Link>
        </nav>
        <div className="footer-follow">
          <h2>New rankings every epoch</h2>
          <Subscribe />
        </div>
      </div>
      <p className="footer-bar">
        Not investment advice. Nobody pays to enter the list. Scores come from public data. Preview profiles are fictional. © 2026 SIIR, formerly Ordinal.
      </p>
    </footer>
  )
}
