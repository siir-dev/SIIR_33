/** True when the user dismissed a wallet prompt on purpose. Not an error worth showing. */
export function isUserRejection(err: unknown): boolean {
  const e = err as { code?: number | string; name?: string; message?: string } | null
  const msg = (e?.message ?? '').toLowerCase()
  return e?.code === 4001 || e?.code === 'ACTION_REJECTED' || /user (rejected|denied|cancel)|rejected the request|request rejected|declined/.test(msg)
}

/** Short, human-readable error text. Never shows stack traces, RPC payloads or library versions. */
export function friendlyError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : ''
  if (!msg || msg.length > 140 || /version:|0x[0-9a-f]{16,}|\n|at \w+\(|viem|ethers/i.test(msg)) return fallback
  return msg
}
