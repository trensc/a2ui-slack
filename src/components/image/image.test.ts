import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderImage } from './image.js';

const context: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
  customComponents: new Map(),
};

function image(partial: Partial<ResolvedOf<'Image'>>): ResolvedOf<'Image'> {
  return {
    type: 'Image',
    id: 'img-1',
    url: 'https://example.com/cat.png',
    altText: 'A cat',
    ...partial,
  };
}

describe('renderImage', () => {
  it('renders an image block with image_url and alt_text, no degradation', () => {
    const result = renderImage(image({}), context);
    expect(result.blocks).toEqual([
      {
        type: 'image',
        image_url: 'https://example.com/cat.png',
        alt_text: 'A cat',
      },
    ]);
    expect(result.degradations).toEqual([]);
  });

  it('drops with a dropped report when the url is empty', () => {
    const result = renderImage(image({ url: '' }), context);
    expect(result.blocks).toHaveLength(1);
    expect(result.degradations).toEqual([
      {
        componentId: 'img-1',
        componentType: 'Image',
        fidelity: 'dropped',
        reason: 'missing image url',
      },
    ]);
  });

  it('substitutes the url for empty alt_text and reports partial', () => {
    const result = renderImage(image({ altText: '' }), context);
    expect(result.blocks).toEqual([
      {
        type: 'image',
        image_url: 'https://example.com/cat.png',
        alt_text: 'https://example.com/cat.png',
      },
    ]);
    expect(result.degradations).toEqual([
      {
        componentId: 'img-1',
        componentType: 'Image',
        fidelity: 'partial',
        reason: 'missing alt text; substituted url',
      },
    ]);
  });

  it('keeps alt_text exactly at the 2000-char limit unclipped', () => {
    const exact = 'a'.repeat(2000);
    const result = renderImage(image({ altText: exact }), context);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'image') {
      throw new Error('expected an image block');
    }
    expect(block.alt_text).toBe(exact);
    expect(block.alt_text.length).toBe(2000);
  });

  it('clips alt_text over 2000 chars with an ellipsis', () => {
    const result = renderImage(image({ altText: 'a'.repeat(2001) }), context);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'image') {
      throw new Error('expected an image block');
    }
    expect(block.alt_text.length).toBe(2000);
    expect(block.alt_text.endsWith('…')).toBe(true);
  });
});
