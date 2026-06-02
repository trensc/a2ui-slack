import type { KnownBlock } from '@slack/types';
import type { RenderResult } from './render-context.js';
import type { ResolvedComponent } from './resolved-component.js';

/**
 * The render result for a component that cannot be mapped to Block Kit: one
 * placeholder `section` (Slack rejects empty text, so it is always non-empty)
 * plus a `dropped` `DegradationReport`. Shared by the unimplemented stubs and by
 * real renderers needing an unknown-type fallback — a degradation is never silent.
 */
export function fallbackResult(node: ResolvedComponent, reason: string): RenderResult {
  const block: KnownBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: `\`${node.type}\` not supported` },
  };
  return {
    blocks: [block],
    degradations: [
      { componentId: node.id, componentType: node.type, fidelity: 'dropped', reason },
    ],
  };
}
