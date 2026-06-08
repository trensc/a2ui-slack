import { describe, expect, it } from 'vitest';
import { emptyRegistry, encodeActionId } from '../action-id/action-id.js';
import { InMemoryRegistryStore } from './in-memory-store.js';

describe('InMemoryRegistryStore', () => {
  it('returns undefined for an unknown key', async () => {
    const store = new InMemoryRegistryStore();
    expect(await store.get('missing')).toBeUndefined();
  });

  it('round-trips a registry by key', async () => {
    const store = new InMemoryRegistryStore();
    const { registry } = encodeActionId(
      { kind: 'action', surfaceId: 's1', componentId: 'btn' },
      emptyRegistry,
    );
    await store.set('s1', registry);
    expect(await store.get('s1')).toBe(registry);
  });

  it('reads back the stored key and returns undefined for others', async () => {
    const store = new InMemoryRegistryStore();
    await store.set('s1', emptyRegistry);
    expect(await store.get('s2')).toBeUndefined();
    expect(await store.get('s1')).toBe(emptyRegistry);
  });
});
