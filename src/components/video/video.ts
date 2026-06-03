import { linkFallback } from '../link-fallback/link-fallback.js';
import type { ComponentRenderer, RenderResult } from '../render-context.js';

/** Shown as the link text when the node carries no `altText`. */
const DEFAULT_LABEL = 'Video';

/**
 * Video → a `section` link (`<url|label>`) via the shared link fallback. Block
 * Kit's `video` block needs unfurl-domain allow-listing the renderer can't know
 * about, so a link (which Slack may unfurl) is the safe mapping — always a
 * `partial` report. An empty url omits the block but is still reported.
 */
export const renderVideo: ComponentRenderer<'Video'> = (node): RenderResult => {
  const label =
    node.altText !== undefined && node.altText.length > 0 ? node.altText : DEFAULT_LABEL;
  return linkFallback(node, node.url, label, 'no native video block in Block Kit');
};
