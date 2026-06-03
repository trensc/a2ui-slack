import type { DividerBlock } from '@slack/types';
import type { ComponentRenderer, RenderResult } from '../render-context.js';

/**
 * Divider → a Block Kit `divider`. The resolved node carries no axis, so this is
 * always a horizontal rule — a faithful mapping with no fidelity loss and thus no
 * degradation.
 */
export const renderDivider: ComponentRenderer<'Divider'> = (): RenderResult => {
  const block: DividerBlock = { type: 'divider' };
  return { blocks: [block], degradations: [] };
};
