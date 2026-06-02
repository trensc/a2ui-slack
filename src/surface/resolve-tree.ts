import type { ResolvedComponent } from '../components/resolved-component.js';
import type { ResolvedTree } from './resolved-tree.js';

/**
 * Provisional input shape: a set of already-resolved nodes plus the root id.
 * Task B replaces this with the `@a2ui/web_core`-bound surface snapshot and adds
 * the real binding/`checks`/`List`-template resolution — producing the same
 * `ResolvedTree` output, so component tasks can code against it now.
 */
export interface ResolveTreeInput {
  readonly root: string;
  readonly nodes: readonly ResolvedComponent[];
}

/**
 * Skeleton binder: indexes the (already resolved) nodes by id and carries the
 * root through. Pure and deterministic — the identity case of what task B fills in.
 */
export function resolveTree(input: ResolveTreeInput): ResolvedTree {
  return {
    root: input.root,
    byId: new Map(input.nodes.map((node) => [node.id, node])),
  };
}
