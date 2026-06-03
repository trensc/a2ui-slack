import type { KnownBlock } from '@slack/types';
import { clip } from '../../limits/clip.js';
import type { DegradationReport, RenderResult } from '../render-context.js';
import type { ResolvedComponent } from '../resolved-component.js';

/** Slack `section.text` hard limit (chars). */
const SECTION_TEXT_LIMIT = 3000;

/**
 * Degrade a media/url component to a single Slack `section` link
 * (`<url|label>`), letting Slack unfurl it. Shared by `Video` and
 * `AudioPlayer`, which have no native Block Kit element.
 *
 * The whole mrkdwn string (link syntax + url + label) is clipped to the
 * `section.text` limit so the message is never rejected. An empty/missing url
 * cannot form a valid link, so the block is omitted (Slack rejects empty
 * blocks) — but a `partial` report is still emitted, never silent.
 */
export function linkFallback(
  node: ResolvedComponent,
  url: string,
  label: string,
  reason: string,
): RenderResult {
  const degradation: DegradationReport = {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason,
  };
  if (url.length === 0) {
    return { blocks: [], degradations: [degradation] };
  }
  const text = clip(`<${url}|${label}>`, SECTION_TEXT_LIMIT);
  const block: KnownBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text },
  };
  return { blocks: [block], degradations: [degradation] };
}
