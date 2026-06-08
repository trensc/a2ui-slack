import { describe, expect, it } from 'vitest';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { TokenRegistry } from '../action-id/action-id.js';
import type { RegistryStore } from './registry-store.js';
import { createSlackSurface } from './create-slack-surface.js';

/** A minimal surface: Column -> Button(action) -> Text label. */
const MESSAGES: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: 's1', catalogId: 'a2ui-slack' } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 's1',
      components: [
        { component: 'Column', id: 'root', children: ['btn'] },
        { component: 'Button', id: 'btn', child: 'lbl', action: { event: { name: 'go' } } },
        { component: 'Text', id: 'lbl', text: 'Go' },
      ],
    },
  },
];

/** A RegistryStore that records the keys it is asked for, to assert keying. */
class RecordingStore implements RegistryStore {
  readonly getKeys: string[] = [];
  readonly setKeys: string[] = [];
  private readonly map = new Map<string, TokenRegistry>();
  get(key: string): Promise<TokenRegistry | undefined> {
    this.getKeys.push(key);
    return Promise.resolve(this.map.get(key));
  }
  set(key: string, registry: TokenRegistry): Promise<void> {
    this.setKeys.push(key);
    this.map.set(key, registry);
    return Promise.resolve();
  }
}

describe('createSlackSurface.render', () => {
  it('renders processed A2UI messages to Slack blocks', async () => {
    const surface = createSlackSurface();
    const { blocks } = await surface.render('s1', MESSAGES);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks).toContainEqual(expect.objectContaining({ type: 'actions' }));
  });

  it('throws a clear error when the surface was never created', async () => {
    const surface = createSlackSurface();
    await expect(surface.render('ghost', [])).rejects.toThrow(/ghost/);
  });

  it('persists the grown registry under the surface key and reuses it on re-render', async () => {
    const store = new RecordingStore();
    const surface = createSlackSurface({ store });
    await surface.render('s1', MESSAGES);
    await surface.render('s1', []);
    expect(store.setKeys).toEqual(['s1', 's1']);
    expect(store.getKeys).toEqual(['s1', 's1']);
  });

  it('namespaces the store key with keyPrefix', async () => {
    const store = new RecordingStore();
    const surface = createSlackSurface({ store, keyPrefix: 'team1:', catalogId: 'a2ui-slack' });
    await surface.render('s1', MESSAGES);
    expect(store.setKeys).toEqual(['team1:s1']);
  });

  it('accepts an explicit surfaceKind', async () => {
    const surface = createSlackSurface();
    const asModal = await surface.render('s1', MESSAGES, 'modal');
    expect(asModal.blocks.length).toBeGreaterThan(0);
  });

  it('registers the catalog under the custom catalogId so messages that reference it resolve correctly', async () => {
    const customMessages: A2uiMessage[] = [
      { version: 'v0.9', createSurface: { surfaceId: 's2', catalogId: 'custom-cat' } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 's2',
          components: [
            { component: 'Column', id: 'root', children: ['btn'] },
            { component: 'Button', id: 'btn', child: 'lbl', action: { event: { name: 'go' } } },
            { component: 'Text', id: 'lbl', text: 'Go' },
          ],
        },
      },
    ];
    const surface = createSlackSurface({ catalogId: 'custom-cat' });
    const { blocks } = await surface.render('s2', customMessages);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks).toContainEqual(expect.objectContaining({ type: 'actions' }));
  });
});
