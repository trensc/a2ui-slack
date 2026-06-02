import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderDivider } from './divider.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderDivider (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderDivider({ type: 'Divider', id: 'id' }, ctx);
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Divider',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
