/**
 * Tiny in-process cache for public read endpoints. The hosted database costs ~0.3s per round trip,
 * and a ranking only changes when an editor publishes, so a short TTL is invisible to readers.
 * Concurrent requests for the same key share one in-flight load.
 */
export class TtlCache<T> {
  private entries = new Map<string, { value: Promise<T>; expires: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 300,
  ) {}

  wrap(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load().catch((err) => {
      this.entries.delete(key); // never cache failures (404s included)
      throw err;
    });
    if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
    this.entries.set(key, { value, expires: now + this.ttlMs });
    return value;
  }

  clear() {
    this.entries.clear();
  }
}
