import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderButton } from './button.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderButton (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderButton(
      { type: 'Button', id: 'id', label: 'l', disabled: false, hasServerAction: false },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Button',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
