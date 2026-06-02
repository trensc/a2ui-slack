import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderChoicePicker } from './choice-picker.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderChoicePicker (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderChoicePicker(
      {
        type: 'ChoicePicker',
        id: 'id',
        options: [],
        selected: [],
        multiple: false,
        path: '/p',
      },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'ChoicePicker',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
