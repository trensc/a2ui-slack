import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderRow } from './row.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderRow (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderRow(
      { type: 'Row', id: 'id', childrenIds: [] },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Row',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
