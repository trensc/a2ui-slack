import type { ContextBlock } from '@slack/types';
import { fallbackResult } from '../fallback.js';
import type { ComponentRenderer, RenderResult } from '../render-context.js';

/**
 * Known A2UI icon name → Slack emoji shortcode. Block Kit has no icon element,
 * so an icon becomes a single emoji glyph in a `context` block. Names outside
 * this map have no safe Slack equivalent and are dropped (reported), rather than
 * guessing a wrong glyph.
 */
const ICON_EMOJI: Readonly<Record<string, string>> = {
  add: 'heavy_plus_sign',
  check: 'white_check_mark',
  close: 'x',
  delete: 'wastebasket',
  download: 'arrow_down',
  edit: 'pencil2',
  error: 'no_entry',
  info: 'information_source',
  search: 'mag',
  settings: 'gear',
  star: 'star',
  upload: 'arrow_up',
  warning: 'warning',
};

/**
 * Icon → an emoji `:name:` inside a `context` block. Unknown names map to no
 * Slack glyph, so the icon is dropped with a `dropped` report — never silent and
 * never a wrong-icon guess.
 */
export const renderIcon: ComponentRenderer<'Icon'> = (node): RenderResult => {
  const emoji = ICON_EMOJI[node.name];
  if (emoji === undefined) {
    return fallbackResult(node, `unknown icon name: ${node.name}`);
  }
  const block: ContextBlock = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `:${emoji}:` }],
  };
  return { blocks: [block], degradations: [] };
};
