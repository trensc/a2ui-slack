import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderTextField } from './text-field.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderTextField (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderTextField(
      {
        type: 'TextField',
        id: 'id',
        label: 'l',
        value: 'v',
        path: '/p',
        multiline: false,
        disabled: false,
      },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'TextField',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
