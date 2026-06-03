import { linkFallback } from '../link-fallback/link-fallback.js';
import type { ComponentRenderer, RenderResult } from '../render-context.js';

/** Shown as the link text when the node carries no `altText`. */
const DEFAULT_LABEL = 'Audio';

/**
 * AudioPlayer → a `section` link (`<url|label>`) via the shared link fallback.
 * Block Kit has no audio element, so the audio becomes a link (which Slack may
 * unfurl) — always a `partial` report. An empty url omits the block but is still
 * reported.
 */
export const renderAudioPlayer: ComponentRenderer<'AudioPlayer'> = (
  node,
): RenderResult => {
  const label =
    node.altText !== undefined && node.altText.length > 0 ? node.altText : DEFAULT_LABEL;
  return linkFallback(node, node.url, label, 'no native audio block in Block Kit');
};
