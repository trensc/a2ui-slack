import { describe, expect, it } from 'vitest';
import type { ResolvedComponent } from '../resolved-component.js';
import { linkFallback } from './link-fallback.js';

const videoNode: Extract<ResolvedComponent, { type: 'Video' }> = {
  type: 'Video',
  id: 'vid-1',
  url: 'https://example.com/clip.mp4',
  altText: 'A clip',
};

const audioNode: Extract<ResolvedComponent, { type: 'AudioPlayer' }> = {
  type: 'AudioPlayer',
  id: 'aud-1',
  url: 'https://example.com/song.mp3',
};

describe('linkFallback', () => {
  it('renders a single section mrkdwn block with <url|label>', () => {
    const result = linkFallback(
      videoNode,
      videoNode.url,
      'Watch the clip',
      'no native video block',
    );

    expect(result.blocks).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<https://example.com/clip.mp4|Watch the clip>',
        },
      },
    ]);
  });

  it('emits exactly one partial degradation carrying the caller reason and node identity', () => {
    const result = linkFallback(
      audioNode,
      audioNode.url,
      'Listen',
      'no native audio block',
    );

    expect(result.degradations).toEqual([
      {
        componentId: 'aud-1',
        componentType: 'AudioPlayer',
        fidelity: 'partial',
        reason: 'no native audio block',
      },
    ]);
  });

  it('clips the rendered link text to the 3000-char section limit', () => {
    const label = 'L'.repeat(4000);
    const result = linkFallback(videoNode, videoNode.url, label, 'too long');

    expect(result.blocks).toHaveLength(1);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'section' || block.text === undefined) {
      throw new Error('expected a section block with text');
    }
    expect(block.text.text.length).toBe(3000);
    expect(block.text.text.startsWith('<https://example.com/clip.mp4|')).toBe(true);
    expect(block.text.text.endsWith('…')).toBe(true);
  });

  it('omits the block but still reports when url is empty', () => {
    const result = linkFallback(videoNode, '', 'Watch', 'missing url');

    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([
      {
        componentId: 'vid-1',
        componentType: 'Video',
        fidelity: 'partial',
        reason: 'missing url',
      },
    ]);
  });
});
