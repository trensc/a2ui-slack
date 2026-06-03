import type { ImageBlock } from '@slack/types';
import { clip } from '../../limits/clip.js';
import { fallbackResult } from '../fallback.js';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderResult,
} from '../render-context.js';

/** Slack `image.alt_text` hard limit (chars). */
const ALT_TEXT_LIMIT = 2000;

/**
 * Image → an `image` block. `alt_text` is required and must be non-empty (Slack
 * rejects the whole message otherwise), so an empty `altText` falls back to the
 * url with a `partial` report. A missing/empty `url` cannot form a valid image
 * block, so the component is dropped with a `dropped` report — never silent.
 */
export const renderImage: ComponentRenderer<'Image'> = (node): RenderResult => {
  if (node.url.length === 0) {
    return fallbackResult(node, 'missing image url');
  }
  const hasAlt = node.altText.length > 0;
  const block: ImageBlock = {
    type: 'image',
    image_url: node.url,
    alt_text: clip(hasAlt ? node.altText : node.url, ALT_TEXT_LIMIT),
  };
  return { blocks: [block], degradations: hasAlt ? [] : [missingAlt(node)] };
};

function missingAlt(node: { id: string; type: 'Image' }): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'missing alt text; substituted url',
  };
}
