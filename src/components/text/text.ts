import type { HeaderBlock, KnownBlock, SectionBlock } from '@slack/types';
import { clip } from '../../limits/clip.js';
import type { ComponentRenderer, RenderResult } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';

/** Slack `header.text` (plain_text) hard limit (chars). */
const HEADER_TEXT_LIMIT = 150;
/** Slack `section.text` hard limit (chars). */
const SECTION_TEXT_LIMIT = 3000;

/** Variants that map to a Block Kit `header` (large, bold, plain_text). */
function isHeading(variant: ResolvedOf<'Text'>['variant']): boolean {
  return variant === 'h1' || variant === 'h2';
}

/** Build a `header` block, clipped to the plain_text 150-char limit. */
function headerBlock(text: string): HeaderBlock {
  return {
    type: 'header',
    text: { type: 'plain_text', text: clip(text, HEADER_TEXT_LIMIT) },
  };
}

/** Build a `section` mrkdwn block, clipped to the 3000-char limit. */
function sectionBlock(text: string): SectionBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text: clip(text, SECTION_TEXT_LIMIT) },
  };
}

/**
 * Text → `header` (h1/h2, plain_text ≤150) or `section` mrkdwn (≤3000). An empty
 * string is rejected by Slack, so the block is omitted; the binding was already
 * resolved upstream, so an empty result is legitimate and emits no degradation.
 */
export const renderText: ComponentRenderer<'Text'> = (node): RenderResult => {
  if (node.text.length === 0) {
    return { blocks: [], degradations: [] };
  }
  const block: KnownBlock = isHeading(node.variant)
    ? headerBlock(node.text)
    : sectionBlock(node.text);
  return { blocks: [block], degradations: [] };
};
