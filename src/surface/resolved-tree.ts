import type { ResolvedComponent } from '../components/resolved-component.js';

/**
 * A fully resolved component tree, flattened for rendering. Block Kit has no
 * nesting, so containers hold child *ids* and the renderer resolves them through
 * `byId` — hence an id-keyed lookup plus the `root` to start the walk.
 *
 * This output shape is the frozen contract between the surface layer (which
 * produces it) and the renderers (which consume it via `RenderContext.renderChild`).
 */
export interface ResolvedTree {
  readonly root: string;
  readonly byId: ReadonlyMap<string, ResolvedComponent>;
}
