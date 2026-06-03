import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderVideo } from './video.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

function video(partial: Partial<ResolvedOf<'Video'>>): ResolvedOf<'Video'> {
  return { type: 'Video', id: 'vid-1', url: 'https://x.test/clip.mp4', ...partial };
}

const REASON = 'no native video block in Block Kit';

describe('renderVideo', () => {
  it('renders a link using altText as the label with a partial report', () => {
    const result = renderVideo(video({ altText: 'Watch this' }), ctx);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/clip.mp4|Watch this>' },
      },
    ]);
    expect(result.degradations).toEqual([
      {
        componentId: 'vid-1',
        componentType: 'Video',
        fidelity: 'partial',
        reason: REASON,
      },
    ]);
  });

  it('falls back to the default label when altText is undefined', () => {
    const result = renderVideo(video({}), ctx);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/clip.mp4|Video>' },
      },
    ]);
  });

  it('falls back to the default label when altText is the empty string', () => {
    const result = renderVideo(video({ altText: '' }), ctx);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://x.test/clip.mp4|Video>' },
      },
    ]);
  });

  it('omits the block but still reports partial when the url is empty', () => {
    const result = renderVideo(video({ url: '', altText: 'Watch' }), ctx);
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([
      {
        componentId: 'vid-1',
        componentType: 'Video',
        fidelity: 'partial',
        reason: REASON,
      },
    ]);
  });
});
