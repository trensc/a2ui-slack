import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderText } from './text.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

function text(partial: Partial<ResolvedOf<'Text'>>): ResolvedOf<'Text'> {
  return { type: 'Text', id: 'txt-1', text: 'hello', ...partial };
}

describe('renderText', () => {
  it('renders a body variant as a section mrkdwn block, no degradation', () => {
    const result = renderText(text({ variant: 'body', text: 'plain body' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'plain body' } },
    ]);
    expect(result.degradations).toEqual([]);
  });

  it('renders an undefined variant as a section mrkdwn block', () => {
    const result = renderText(text({ text: 'no variant' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'no variant' } },
    ]);
  });

  it('renders h1 as a plain_text header block', () => {
    const result = renderText(text({ variant: 'h1', text: 'Title' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'header', text: { type: 'plain_text', text: 'Title' } },
    ]);
    expect(result.degradations).toEqual([]);
  });

  it('renders h2 as a plain_text header block', () => {
    const result = renderText(text({ variant: 'h2', text: 'Subtitle' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'header', text: { type: 'plain_text', text: 'Subtitle' } },
    ]);
  });

  it('renders h3 (non-heading) as a section block', () => {
    const result = renderText(text({ variant: 'h3', text: 'H3 text' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'H3 text' } },
    ]);
  });

  it('omits the block with no degradation when text is empty', () => {
    const result = renderText(text({ text: '' }), ctx);
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([]);
  });

  it('keeps section text exactly at the 3000-char limit unclipped', () => {
    const exact = 'a'.repeat(3000);
    const result = renderText(text({ variant: 'body', text: exact }), ctx);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'section' || block.text === undefined) {
      throw new Error('expected a section block');
    }
    expect(block.text.text).toBe(exact);
    expect(block.text.text.length).toBe(3000);
  });

  it('clips section text over 3000 chars with an ellipsis', () => {
    const result = renderText(text({ variant: 'body', text: 'a'.repeat(3001) }), ctx);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'section' || block.text === undefined) {
      throw new Error('expected a section block');
    }
    expect(block.text.text.length).toBe(3000);
    expect(block.text.text.endsWith('…')).toBe(true);
  });

  it('keeps header text exactly at the 150-char limit unclipped', () => {
    const exact = 'h'.repeat(150);
    const result = renderText(text({ variant: 'h1', text: exact }), ctx);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'header') {
      throw new Error('expected a header block');
    }
    expect(block.text.text).toBe(exact);
    expect(block.text.text.length).toBe(150);
  });

  it('clips header text over 150 chars with an ellipsis', () => {
    const result = renderText(text({ variant: 'h2', text: 'h'.repeat(151) }), ctx);
    const [block] = result.blocks;
    if (block === undefined || block.type !== 'header') {
      throw new Error('expected a header block');
    }
    expect(block.text.text.length).toBe(150);
    expect(block.text.text.endsWith('…')).toBe(true);
  });
});
