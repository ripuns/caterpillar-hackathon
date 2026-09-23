/**
 * CONTRACTS.md §8.4: simple in-memory TTL cache for expensive recomputed
 * reads. Not a real production cache (no eviction policy, no size limit) —
 * demonstrates awareness of the cost of recomputing a join/aggregation on
 * every request, appropriate for this build's scale.
 */
export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
