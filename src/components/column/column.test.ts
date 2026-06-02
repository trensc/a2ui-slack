import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderColumn } from './column.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderColumn (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderColumn(
      { type: 'Column', id: 'id', childrenIds: [] },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Column',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
