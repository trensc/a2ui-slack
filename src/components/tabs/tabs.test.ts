import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderTabs } from './tabs.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderTabs (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderTabs(
      { type: 'Tabs', id: 'id', tabs: [], activeIndex: 0 },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Tabs',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
