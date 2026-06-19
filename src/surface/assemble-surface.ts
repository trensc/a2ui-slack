import type { ContextBlock, KnownBlock } from '@slack/types';
import { renderComponent } from '../components/render-component.js';
import type {
  DegradationReport,
  RenderContext,
  RenderResult,
} from '../components/render-context.js';
import type { ActionIdRef } from '../action-id/action-id-ref.js';
import { encodeActionId } from '../action-id/action-id.js';
import type { TokenRegistry } from '../action-id/action-id.js';
import {
  MESSAGE_BLOCK_MAX,
  VIEW_BLOCK_MAX,
  clampBlocks,
} from '../limits/clamp-blocks.js';
import type { SurfaceKind } from './surface-target.js';
import type { ResolvedTree } from './resolved-tree.js';
import type { CustomComponentRegistry } from '../components/custom/custom-component.js';

export interface AssembleSurfaceInput {
  readonly tree: ResolvedTree;
  readonly surfaceId: string;
  readonly surfaceKind: SurfaceKind;
  /** Per-surface token registry, threaded across re-renders by the consumer. */
  readonly registry: TokenRegistry;
  /** Registered custom components forwarded to the render context. Defaults to empty when omitted. */
  readonly customComponents?: CustomComponentRegistry;
}

export interface AssembledSurface {
  readonly blocks: readonly KnownBlock[];
  /** Component-scoped fidelity losses, aggregated from the whole tree. */
  readonly degradations: readonly DegradationReport[];
  /** Surface-level structural notes (truncation, missing component ids). */
  readonly notices: readonly string[];
  /** The (possibly grown) registry to persist for the next render. */
  readonly registry: TokenRegistry;
}

/** Mutable accumulators threaded through the render walk (kept local — pure overall). */
interface Walk {
  registry: TokenRegistry;
  readonly notices: string[];
}

/**
 * Walk a resolved tree from its root into a flat Block Kit list. `renderComponent`
 * is driven through a `RenderContext` whose `renderChild` recurses via the tree's
 * `byId` map and whose `encodeActionId` injects the surface id and threads the
 * token registry. The global block cap (50 message / 100 view) is applied last;
 * overflow is truncated with a marker block and recorded as a notice.
 */
export function assembleSurface(input: AssembleSurfaceInput): AssembledSurface {
  const walk: Walk = { registry: input.registry, notices: [] };
  const context = buildContext(input, walk);
  const rendered = context.renderChild(input.tree.root);
  const max = input.surfaceKind === 'message' ? MESSAGE_BLOCK_MAX : VIEW_BLOCK_MAX;
  if (!clampBlocks(rendered.blocks, max).truncated) {
    return {
      blocks: rendered.blocks,
      degradations: rendered.degradations,
      notices: walk.notices,
      registry: walk.registry,
    };
  }
  // Reserve one slot for the truncation marker so the result still fits `max`.
  const kept = clampBlocks(rendered.blocks, max - 1).blocks;
  const hidden = rendered.blocks.length - kept.length;
  walk.notices.push(
    `${String(hidden)} block(s) hidden (Slack ${String(max)}-block limit)`,
  );
  return {
    blocks: [...kept, hiddenMarker(hidden)],
    degradations: rendered.degradations,
    notices: walk.notices,
    registry: walk.registry,
  };
}

function buildContext(input: AssembleSurfaceInput, walk: Walk): RenderContext {
  const context: RenderContext = {
    surfaceKind: input.surfaceKind,
    customComponents: input.customComponents ?? new Map(),
    renderChild: (id: string): RenderResult => {
      const node = input.tree.byId.get(id);
      if (node === undefined) {
        walk.notices.push(`missing component: ${id}`);
        return missingBlock(id);
      }
      return renderComponent(node, context);
    },
    encodeActionId: (ref: Omit<ActionIdRef, 'surfaceId'>): string => {
      const result = encodeActionId(
        { ...ref, surfaceId: input.surfaceId },
        walk.registry,
      );
      walk.registry = result.registry;
      return result.id;
    },
  };
  return context;
}

function missingBlock(id: string): RenderResult {
  return {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `⚠️ missing component \`${id}\`` },
      },
    ],
    degradations: [],
  };
}

function hiddenMarker(count: number): ContextBlock {
  return {
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `_… ${String(count)} more block(s) hidden (Slack limit)_` },
    ],
  };
}
