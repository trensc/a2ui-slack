import type { KnownBlock } from '@slack/types';
import type { ComponentRenderer } from '../render-context.js';

const DROP_REASON =
  'Modal is not in the reduced catalog and cannot be sent to this surface';

/**
 * Modal → V1 placeholder. Modal is not part of the declared reduced catalog, so
 * the agent should never emit one. If it does arrive, we refuse it loudly: a
 * single placeholder `section` plus a `dropped` `DegradationReport`. The V2 path
 * (trigger → `views.open(content)`) is impure I/O and lives in `examples/`, so
 * this pure renderer ignores `triggerId` / `contentId` entirely.
 */
export const renderModal: ComponentRenderer<'Modal'> = (node) => {
  const block: KnownBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: 'Modal not supported in this surface' },
  };
  return {
    blocks: [block],
    degradations: [
      {
        componentId: node.id,
        componentType: node.type,
        fidelity: 'dropped',
        reason: DROP_REASON,
      },
    ],
  };
};
