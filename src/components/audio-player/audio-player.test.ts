import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderAudioPlayer } from './audio-player.js';

const context: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

function audio(partial: Partial<ResolvedOf<'AudioPlayer'>>): ResolvedOf<'AudioPlayer'> {
  return { type: 'AudioPlayer', id: 'aud-1', url: 'https://x.test/song.mp3', ...partial };
}

const REASON = 'no native audio block in Block Kit';

describe('renderAudioPlayer', () => {
  it('renders a link using altText as the label with a partial report', () => {
    const result = renderAudioPlayer(audio({ altText: 'Listen now' }), context);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/song.mp3|Listen now>' },
      },
    ]);
    expect(result.degradations).toEqual([
      {
        componentId: 'aud-1',
        componentType: 'AudioPlayer',
        fidelity: 'partial',
        reason: REASON,
      },
    ]);
  });

  it('falls back to the default label when altText is undefined', () => {
    const result = renderAudioPlayer(audio({}), context);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/song.mp3|Audio>' },
      },
    ]);
  });

  it('falls back to the default label when altText is the empty string', () => {
    const result = renderAudioPlayer(audio({ altText: '' }), context);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/song.mp3|Audio>' },
      },
    ]);
  });

  it('omits the block but still reports partial when the url is empty', () => {
    const result = renderAudioPlayer(audio({ url: '', altText: 'Listen' }), context);
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([
      {
        componentId: 'aud-1',
        componentType: 'AudioPlayer',
        fidelity: 'partial',
        reason: REASON,
      },
    ]);
  });
});
