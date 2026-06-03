import type { KnownBlock } from '@slack/types';
import type { ComponentRenderer, DegradationReport } from '../render-context.js';

/**
 * Card → Block Kit. Block Kit has no bordered container, so a card degrades to
 * visual grouping: a `divider`, the single child's blocks, then a closing
 * `divider`. The child renders via `ctx.renderChild(childId)`; its blocks slot
 * between the rules and its degradations merge upward after the card's own
 * `partial` report (container styling is lost). Never silent.
 */
export const renderCard: ComponentRenderer<'Card'> = (node, context) => {
  const child = context.renderChild(node.childId);
  const divider: KnownBlock = { type: 'divider' };
  const cardReport: DegradationReport = {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'no container styling',
  };
  return {
    blocks: [divider, ...child.blocks, divider],
    degradations: [cardReport, ...child.degradations],
  };
};
