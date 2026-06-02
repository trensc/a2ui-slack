import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderModal } from './modal.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderModal (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderModal(
      { type: 'Modal', id: 'id', triggerId: 't', contentId: 'c' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Modal',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
