import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderSlider } from './slider.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderSlider (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderSlider(
      { type: 'Slider', id: 'id', min: 0, max: 10, value: 5, path: '/p' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Slider',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
