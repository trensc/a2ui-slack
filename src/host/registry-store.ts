import type { TokenRegistry } from '../action-id/action-id.js';

/**
 * Persistence seam for per-surface token registries — the only state the host
 * must keep between a render and the interaction that follows it. The default
 * implementation is in-memory ([[InMemoryRegistryStore]]); a Redis/Postgres
 * adapter is ~6 lines of consumer code against this interface. Async so those
 * adapters drop in without an API change.
 */
export interface RegistryStore {
  /** Load the registry for `key`, or `undefined` if this surface is new. */
  get(key: string): Promise<TokenRegistry | undefined>;
  /** Persist the (grown) registry for `key`. */
  set(key: string, registry: TokenRegistry): Promise<void>;
}
