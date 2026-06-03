import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderDivider } from './divider.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderDivider', () => {
  it('renders a single divider block with no degradation', () => {
    const result = renderDivider({ type: 'Divider', id: 'div-1' }, ctx);
    expect(result.blocks).toEqual([{ type: 'divider' }]);
    expect(result.degradations).toEqual([]);
  });
});
