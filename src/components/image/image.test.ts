import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderImage } from './image.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderImage (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderImage(
      { type: 'Image', id: 'id', url: 'u', altText: 'a' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Image',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
