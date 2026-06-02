import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderDateTimeInput } from './date-time-input.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderDateTimeInput (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderDateTimeInput(
      { type: 'DateTimeInput', id: 'id', path: '/p', mode: 'date' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'DateTimeInput',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
