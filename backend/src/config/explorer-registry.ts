/**
 * Chains SIIR indexes. Solana is public mainnet. Robinhood Chain is an EVM chain whose RPC and explorer are
 * configured per environment (ROBINHOOD_RPC_URL, ROBINHOOD_EXPLORER_URL) so no unverified endpoint is hardcoded.
 */
export type ChainKey = 'solana' | 'robinhood';

export interface ChainConfig {
  key: ChainKey;
  label: string;
  family: 'solana' | 'evm';
  rpcUrl: () => string | undefined;
  addressUrlTemplate: () => string | undefined;
}

export const CHAINS: Record<ChainKey, ChainConfig> = {
  solana: {
    key: 'solana',
    label: 'Solana',
    family: 'solana',
    rpcUrl: () =>
      process.env.SOLANA_RPC_URL ||
      (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 'https://api.mainnet-beta.solana.com'),
    addressUrlTemplate: () => 'https://solscan.io/account/{address}',
  },
  robinhood: {
    key: 'robinhood',
    label: 'Robinhood Chain',
    family: 'evm',
    rpcUrl: () => process.env.ROBINHOOD_RPC_URL || undefined,
    addressUrlTemplate: () => (process.env.ROBINHOOD_EXPLORER_URL ? `${process.env.ROBINHOOD_EXPLORER_URL.replace(/\/$/, '')}/address/{address}` : undefined),
  },
};

export function isChainKey(value: string): value is ChainKey {
  return value === 'solana' || value === 'robinhood';
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddressForChain(chain: ChainKey, address: string): boolean {
  return CHAINS[chain].family === 'solana' ? BASE58.test(address) : EVM.test(address);
}

export function explorerUrl(chain: string, address: string): string {
  if (!isChainKey(chain)) return '';
  return CHAINS[chain].addressUrlTemplate()?.replace('{address}', address) ?? '';
}

export function realmFromChains(chains: string[]): 'velocity' | 'ledger' | 'bridged' {
  const sol = chains.includes('solana');
  const rh = chains.includes('robinhood');
  return sol && rh ? 'bridged' : rh ? 'ledger' : 'velocity';
}
