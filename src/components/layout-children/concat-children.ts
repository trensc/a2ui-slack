import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';

/**
 * Render each child id via `context.renderChild` and concatenate their results in
 * order: child blocks flatten into one run, child degradations merge upward. The
 * shared linearisation step for every layout container (Column, List, Card, Row's
 * vertical fallback, Tabs). Pure — it only forwards to the supplied context.
 */
export function concatChildren(
  childrenIds: readonly string[],
  context: RenderContext,
): RenderResult {
  const blocks: KnownBlock[] = [];
  const degradations: RenderResult['degradations'][number][] = [];
  for (const childId of childrenIds) {
    const child = context.renderChild(childId);
    blocks.push(...child.blocks);
    degradations.push(...child.degradations);
  }
  return { blocks, degradations };
}
