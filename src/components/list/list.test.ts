import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderList } from './list.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderList (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderList(
      { type: 'List', id: 'id', childrenIds: [] },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'List',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
