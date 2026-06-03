import type { ImageBlock } from '@slack/types';
import { clip } from '../../limits/clip.js';
import { fallbackResult } from '../fallback.js';
import type { ComponentRenderer, RenderResult } from '../render-context.js';

/** Slack `image.alt_text` hard limit (chars). */
const ALT_TEXT_LIMIT = 2000;

/**
 * Image → an `image` block. `alt_text` is required by Slack, so the resolved
 * `altText` is clipped to 2000 chars. A missing/empty `url` cannot form a valid
 * image block (Slack would reject the message), so the component is dropped with
 * a `dropped` report — never silent.
 */
export const renderImage: ComponentRenderer<'Image'> = (node): RenderResult => {
  if (node.url.length === 0) {
    return fallbackResult(node, 'missing image url');
  }
  const block: ImageBlock = {
    type: 'image',
    image_url: node.url,
    alt_text: clip(node.altText, ALT_TEXT_LIMIT),
  };
  return { blocks: [block], degradations: [] };
};
