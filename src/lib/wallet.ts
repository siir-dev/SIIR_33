export type WalletKind = 'evm' | 'solana'

interface InjectedEvm {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}
interface InjectedSolana {
  connect(): Promise<{ publicKey: { toString(): string } }>
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>
}
declare global {
  interface Window {
    ethereum?: InjectedEvm
    solana?: InjectedSolana
  }
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export async function connectWallet(kind: WalletKind): Promise<string> {
  if (kind === 'evm') {
    if (!window.ethereum) throw new Error('No EVM wallet found. Install MetaMask or another injected wallet.')
    const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts[0]) throw new Error('The wallet returned no account.')
    return accounts[0]
  }
  if (!window.solana) throw new Error('No Solana wallet found. Install Phantom or another injected wallet.')
  const { publicKey } = await window.solana.connect()
  return publicKey.toString()
}

/** EVM: EIP-191 personal_sign, returned 0x-hex. Solana: ed25519 over the UTF-8 message, returned hex. */
export async function signMessage(kind: WalletKind, address: string, message: string): Promise<string> {
  const bytes = new TextEncoder().encode(message)
  if (kind === 'evm') {
    if (!window.ethereum) throw new Error('The EVM wallet is no longer available.')
    return (await window.ethereum.request({ method: 'personal_sign', params: ['0x' + hex(bytes), address] })) as string
  }
  if (!window.solana) throw new Error('The Solana wallet is no longer available.')
  const { signature } = await window.solana.signMessage(bytes, 'utf8')
  return hex(signature)
}

export const nominationMessage = (name: string, handle: string, wallet: string) => `Nominate: ${name} (@${handle}) by ${wallet}`
