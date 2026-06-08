import type { TokenRegistry } from '../action-id/action-id.js';
import type { RegistryStore } from './registry-store.js';

/**
 * A process-local [[RegistryStore]] backed by a `Map`. Default for development
 * and any single, long-lived process.
 *
 * WARNING: it does NOT survive across processes. On serverless / multi-instance
 * deployments (the common Slack webhook setup, where the render invocation and
 * the interaction invocation are different processes) supply a shared store
 * (Redis/Postgres) instead, or inbound interactions decode against an empty
 * registry and are silently dropped.
 */
export class InMemoryRegistryStore implements RegistryStore {
  private readonly registries = new Map<string, TokenRegistry>();

  get(key: string): Promise<TokenRegistry | undefined> {
    return Promise.resolve(this.registries.get(key));
  }

  set(key: string, registry: TokenRegistry): Promise<void> {
    this.registries.set(key, registry);
    return Promise.resolve();
  }
}
