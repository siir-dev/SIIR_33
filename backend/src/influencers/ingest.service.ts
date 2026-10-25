import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { CHAINS, ChainKey } from '../config/explorer-registry';
import { SIGNAL } from '../config/scoring';

export interface SignalReading {
  signalKey: string;
  value: number;
  source: string;
  raw: unknown;
}

const DAY = 86_400;

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

@Injectable()
export class IngestService {
  /** Does this wallet have any history on the chain? Used by the verify step. */
  async hasOnchainActivity(chain: ChainKey, address: string): Promise<boolean> {
    const url = CHAINS[chain].rpcUrl();
    if (!url) throw new Error(`No RPC configured for ${chain}`);
    if (CHAINS[chain].family === 'solana') {
      const sigs = await rpc<unknown[]>(url, 'getSignaturesForAddress', [address, { limit: 1 }]);
      return sigs.length > 0;
    }
    const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
    const [nonce, balance] = await Promise.all([provider.getTransactionCount(address), provider.getBalance(address)]);
    return nonce > 0 || balance > 0n;
  }

  /** Verified on-chain footprint of one wallet. */
  async fetchOnchainSignals(chain: ChainKey, address: string): Promise<SignalReading[]> {
    const url = CHAINS[chain].rpcUrl();
    if (!url) return [];
    const source = `${chain}-rpc`;

    if (CHAINS[chain].family === 'solana') {
      const sigs = await rpc<{ blockTime: number | null; err: unknown }[]>(url, 'getSignaturesForAddress', [address, { limit: 1000 }]);
      const now = Date.now() / 1000;
      const recent = sigs.filter((s) => s.blockTime && now - s.blockTime <= 90 * DAY && !s.err).length;
      const oldest = sigs.reduce<number>((min, s) => (s.blockTime && s.blockTime < min ? s.blockTime : min), now);
      const readings: SignalReading[] = [{ signalKey: SIGNAL.txCount90d, value: recent, source, raw: { sampled: sigs.length } }];
      // A full page means older history exists, so the oldest signature seen is not the wallet's age. Leave it unevidenced.
      if (sigs.length < 1000) readings.push({ signalKey: SIGNAL.walletAgeDays, value: Math.round((now - oldest) / DAY), source, raw: { oldest } });
      return readings;
    }

    // EVM without an indexer: the account nonce is the number of transactions the wallet has sent in total.
    const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
    const nonce = await provider.getTransactionCount(address);
    return [{ signalKey: SIGNAL.txCountTotal, value: nonce, source, raw: { nonce } }];
  }

  /**
   * Public audience and interaction from the X API v2. Needs X_BEARER_TOKEN; without it nothing is
   * fabricated and the mind is simply left with unevidenced social dimensions.
   */
  async fetchSocialSignals(handle: string): Promise<SignalReading[]> {
    const token = process.env.X_BEARER_TOKEN;
    if (!token) return [];
    const headers = { Authorization: `Bearer ${token}` };
    const base = 'https://api.x.com/2';

    const userRes = await fetch(`${base}/users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!userRes.ok) throw new Error(`X API user lookup returned ${userRes.status}`);
    const user = (await userRes.json()) as { data?: { id: string; public_metrics: { followers_count: number } } };
    if (!user.data) return [];
    const followers = user.data.public_metrics.followers_count;
    const readings: SignalReading[] = [{ signalKey: SIGNAL.followers, value: followers, source: 'x-api', raw: user.data.public_metrics }];

    const tweetsRes = await fetch(
      `${base}/users/${user.data.id}/tweets?max_results=20&exclude=retweets,replies&tweet.fields=public_metrics`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (tweetsRes.ok && followers > 0) {
      const tweets = (await tweetsRes.json()) as {
        data?: { public_metrics: { like_count: number; reply_count: number; retweet_count: number; quote_count: number } }[];
      };
      const list = tweets.data ?? [];
      if (list.length) {
        const rate =
          list.reduce((sum, t) => {
            const m = t.public_metrics;
            return sum + (m.like_count + m.reply_count + m.retweet_count + m.quote_count) / followers;
          }, 0) / list.length;
        readings.push({ signalKey: SIGNAL.engagementRate, value: rate, source: 'x-api', raw: { sampled: list.length } });
      }
    }
    return readings;
  }

  async checkUrl(url: string): Promise<{ ok: boolean; status?: number }> {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIIRBot/0.1)' },
        signal: AbortSignal.timeout(8000),
      });
      // Accept 2xx/3xx and 401/403 (WAF-protected real domains)
      return { ok: res.ok || res.status === 401 || res.status === 403, status: res.status };
    } catch {
      return { ok: false };
    }
  }
}
