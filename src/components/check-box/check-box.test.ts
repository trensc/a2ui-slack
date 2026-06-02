import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderCheckBox } from './check-box.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderCheckBox (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderCheckBox(
      { type: 'CheckBox', id: 'id', label: 'l', checked: false, path: '/p' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'CheckBox',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
