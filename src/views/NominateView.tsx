import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Wallet, X } from '@phosphor-icons/react'
import { Art3D } from '../components/Art'
import { FxHeading, PageHero } from '../components/Page'
import { Select } from '../components/Select'
import { api, type MyNomination } from '../lib/api'
import { friendlyError, isUserRejection } from '../lib/errors'
import { usePageMeta } from '../lib/hooks'
import { Link } from '../lib/router'
import { connectWallet, nominationMessage, signMessage, type WalletKind } from '../lib/wallet'

type WalletRow = { chainKey: 'solana' | 'robinhood'; address: string }

const STATUS_COPY: Record<string, string> = {
  submitted: 'Submitted. Waiting for verification.',
  queued: 'Verified. Waiting for signal ingestion.',
  ingesting: 'Reading public signals.',
  analyzing: 'Scoring.',
  draft: 'Scored. Waiting for an editor.',
  in_review: 'With an editor.',
  published: 'Seen. Eligible for the next epoch.',
  decohered: 'Decohered. Previously Seen.',
  rejected_invalid: 'Rejected. Check the wallet addresses.',
}

const PIPELINE = [
  'Your signature is checked',
  'Wallets are verified on-chain',
  'Public signals are read and scored',
  'An editor writes the verdict',
  'The mind enters the next epoch',
]

export function NominateView() {
  usePageMeta('Nominate - SIIR', 'Suggest an influencer for The SIIR 33.')
  const [form, setForm] = useState({ name: '', handle: '', bio: '', website: '', rationale: '' })
  const [wallets, setWallets] = useState<WalletRow[]>([{ chainKey: 'solana', address: '' }])
  const [signer, setSigner] = useState<{ kind: WalletKind; address: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'signing' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [mine, setMine] = useState<MyNomination[]>([])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    if (!signer) return
    api.myNominations(signer.address).then(setMine, () => setMine([]))
  }, [signer, status])

  const connect = async (kind: WalletKind) => {
    setError('')
    setStatus('connecting')
    try {
      setSigner({ kind, address: await connectWallet(kind) })
    } catch (err) {
      setError(isUserRejection(err) ? '' : friendlyError(err, 'Could not connect the wallet. Try again.'))
    }
    setStatus('idle')
  }

  const disconnect = () => {
    setSigner(null)
    setMine([])
    setError('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!signer) return setError('Connect a wallet first. Nominations are signed so someone is accountable for them.')
    setStatus('signing')
    setError('')
    try {
      const handle = form.handle.replace(/^@/, '').toLowerCase()
      const signature = await signMessage(signer.kind, signer.address, nominationMessage(form.name, handle, signer.address))
      setStatus('sending')
      const res = await api.nominate({
        name: form.name,
        handle,
        bio: form.bio || undefined,
        website: form.website || undefined,
        rationale: form.rationale || undefined,
        wallets: wallets.filter((w) => w.address.trim()).map((w) => ({ ...w, address: w.address.trim() })),
        submitterWallet: signer.address,
        signature,
      })
      setResult(res.message)
      setStatus('done')
    } catch (err) {
      setError(isUserRejection(err) ? '' : friendlyError(err, 'Could not send the nomination. Try again.'))
      setStatus('idle')
    }
  }

  const updateWallet = (i: number, patch: Partial<WalletRow>) => setWallets(wallets.map((w, j) => (j === i ? { ...w, ...patch } : w)))

  return (
    <>
      <PageHero
        bg="hero"
        crumbs={[{ label: 'Nominate' }]}
        eyebrow="OPEN SIGNAL"
        title={
          <>
            Suggest
            <em> a mind.</em>
          </>
        }
        dek="Nominations are signed with your wallet, verified on-chain, scored from public data, and read by an editor. Nominating does not buy a place on the list."
        art={<Art3D name="astronaut-left" className="phero-3d" eager />}
        ticker={['Signed by a wallet', 'Scored from public data', 'Read by an editor']}
      />

      <div className="pg pg--wide">
        <div className="nom">
          <div className="nom-main">
            {status === 'done' ? (
              <div className="fx-card nom-done">
                <FxHeading>Nomination received</FxHeading>
                <p>{result}</p>
                <button type="button" className="btn btn-dark" onClick={() => setStatus('idle')}>
                  Nominate another
                </button>
              </div>
            ) : (
              <form className="fx-card form nom-form" onSubmit={submit}>
                <fieldset className="nom-step">
                  <legend>
                    <b className="mono">01</b> Sign with a wallet
                  </legend>
                  <div className="wallet-bar">
                    <div>
                      <strong>{signer ? 'Signing wallet' : 'Connect a wallet'}</strong>
                      <small className="mono">{signer ? signer.address : 'Needed to sign the nomination'}</small>
                    </div>
                    <div className="wallet-actions">
                      {signer ? (
                        <button type="button" className="btn btn-light" onClick={disconnect}>
                          Disconnect
                        </button>
                      ) : (
                        <>
                          <button type="button" className="btn btn-light" disabled={status === 'connecting'} onClick={() => connect('solana')}>
                            <Wallet size={16} /> {status === 'connecting' ? 'Waiting...' : 'Solana'}
                          </button>
                          <button type="button" className="btn btn-light" disabled={status === 'connecting'} onClick={() => connect('evm')}>
                            <Wallet size={16} /> EVM
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="nom-step">
                  <legend>
                    <b className="mono">02</b> Who is the mind
                  </legend>
                  <label>
                    Name
                    <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} autoComplete="off" />
                  </label>
                  <label>
                    X handle
                    <input value={form.handle} onChange={set('handle')} placeholder="@handle" required autoComplete="off" />
                  </label>
                  <label>
                    Bio <span className="muted">(optional)</span>
                    <input value={form.bio} onChange={set('bio')} maxLength={280} autoComplete="off" />
                  </label>
                  <label>
                    Website <span className="muted">(optional)</span>
                    <input type="url" value={form.website} onChange={set('website')} placeholder="https://" autoComplete="off" />
                  </label>
                </fieldset>

                <fieldset className="nom-step wallets">
                  <legend>
                    <b className="mono">03</b> Their wallets (at least one)
                  </legend>
                  {wallets.map((w, i) => (
                    <div className="wallet-row" key={i}>
                      <Select
                        label="Chain"
                        value={w.chainKey}
                        options={[
                          { value: 'solana', label: 'Solana' },
                          { value: 'robinhood', label: 'Robinhood Chain' },
                        ]}
                        onChange={(chainKey) => updateWallet(i, { chainKey })}
                      />
                      <input
                        value={w.address}
                        onChange={(e) => updateWallet(i, { address: e.target.value })}
                        placeholder={w.chainKey === 'solana' ? 'Base58 address' : '0x address'}
                        aria-label="Wallet address"
                        required={i === 0}
                        autoComplete="off"
                      />
                      {wallets.length > 1 && (
                        <button type="button" className="icon-btn" aria-label="Remove wallet" onClick={() => setWallets(wallets.filter((_, j) => j !== i))}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {wallets.length < 4 && (
                    <button type="button" className="text-link" onClick={() => setWallets([...wallets, { chainKey: 'robinhood', address: '' }])}>
                      <Plus size={14} /> Add another wallet
                    </button>
                  )}
                </fieldset>

                <fieldset className="nom-step">
                  <legend>
                    <b className="mono">04</b> Evidence
                  </legend>
                  <label>
                    Why should the Seer watch them? <span className="muted">(optional)</span>
                    <textarea value={form.rationale} onChange={set('rationale')} rows={4} minLength={20} maxLength={600} placeholder="Point to specific calls or signals." />
                  </label>
                </fieldset>

                {error && (
                  <p className="state state--error" role="alert">
                    {error}
                  </p>
                )}
                <button className="btn btn-dark nom-submit" type="submit" disabled={status === 'signing' || status === 'sending'}>
                  {status === 'signing' ? 'Step 1 of 2: confirm in your wallet' : status === 'sending' ? 'Step 2 of 2: sending' : 'Sign and submit'}
                </button>
              </form>
            )}

            {mine.length > 0 && (
              <section>
                <FxHeading>Your nominations</FxHeading>
                <ul className="nominations">
                  {mine.map((n) => (
                    <li key={n.handle} className="fx-card">
                      <strong>{n.name}</strong>
                      <small className="mono">@{n.handle}</small>
                      <p>{STATUS_COPY[n.status] ?? n.status}</p>
                      {n.status === 'published' && <Link href={`/seen/${n.handle}`}>View profile</Link>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="nom-side">
            <div className="fx-card nom-pipe">
              <FxHeading>What happens next</FxHeading>
              <ol>
                {PIPELINE.map((t, i) => (
                  <li key={t}>
                    <b className="mono">{String.fromCharCode(65 + i)}</b>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
