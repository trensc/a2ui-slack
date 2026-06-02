import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderText } from './text.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderText (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderText(
      { type: 'Text', id: 'id', text: 'x' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Text',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
