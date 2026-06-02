import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import { renderAudioPlayer } from './audio-player.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

describe('renderAudioPlayer (stub)', () => {
  it('drops with a not-implemented report', () => {
    const { blocks, degradations } = renderAudioPlayer(
      { type: 'AudioPlayer', id: 'id', url: 'u' },
      ctx,
    );
    expect(blocks).toHaveLength(1);
    expect(degradations).toEqual([
      {
        componentId: 'id',
        componentType: 'AudioPlayer',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
