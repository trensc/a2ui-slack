import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderCard } from './card.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderCard (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderCard(
      { type: 'Card', id: 'id', childId: 'c' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Card',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
