import type { KnownBlock } from '@slack/types';

/** Maximum number of blocks Slack allows per message. */
export const MESSAGE_BLOCK_MAX = 50;
/** Maximum number of blocks Slack allows per modal/home view. */
export const VIEW_BLOCK_MAX = 100;

/** The result of clamping a block list to a count limit. */
export interface ClampBlocksResult {
  /** The blocks, truncated to at most `max`. A fresh array; inputs are not mutated. */
  readonly blocks: readonly KnownBlock[];
  /** True when the input exceeded `max` and blocks were dropped. */
  readonly truncated: boolean;
}

/**
 * Truncate a block list to at most `max` blocks. The caller decides `max`
 * (`MESSAGE_BLOCK_MAX` for messages, `VIEW_BLOCK_MAX` for views). Pure: never
 * mutates the input and never appends a marker block — the surface assembler
 * owns the "… N more hidden" marker and the degradation report.
 */
export function clampBlocks(
  blocks: readonly KnownBlock[],
  max: number,
): ClampBlocksResult {
  const limit = max > 0 ? max : 0;
  if (blocks.length <= limit) {
    return { blocks: blocks.slice(), truncated: false };
  }
  return { blocks: blocks.slice(0, limit), truncated: true };
}
