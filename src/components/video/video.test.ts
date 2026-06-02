import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderVideo } from './video.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderVideo (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderVideo(
      { type: 'Video', id: 'id', url: 'u' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'Video',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
