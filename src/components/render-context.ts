import type { KnownBlock } from '@slack/types';
import type { ActionIdRef } from '../action-id/action-id-ref.js';
import type { SurfaceKind } from '../surface/surface-target.js';
import type { ComponentType, ResolvedComponent } from './resolved-component.js';

/**
 * A component that could not be mapped to Block Kit at full fidelity. Recorded,
 * never silent — `a2ui-spec-guardian` / `block-kit-validator` surface these.
 */
export interface DegradationReport {
  readonly componentId: string;
  readonly componentType: ComponentType;
  readonly fidelity: 'partial' | 'dropped';
  readonly reason: string;
}

/**
 * The output of every renderer: a flat run of Block Kit blocks plus any fidelity
 * losses. Container renderers concatenate child results. Block Kit has no
 * nesting, so the whole tree linearises to a single `KnownBlock[]`.
 */
export interface RenderResult {
  readonly blocks: readonly KnownBlock[];
  readonly degradations: readonly DegradationReport[];
}

/**
 * Everything a pure renderer is allowed to reach. No I/O, no clock, no Slack
 * client — only resolution of children, id encoding, and the target kind (which
 * decides message vs view input behaviour).
 */
export interface RenderContext {
  /** Render a child component by id and return its blocks. */
  readonly renderChild: (componentId: string) => RenderResult;
  /** Encode a Slack-safe (≤255 char) action_id carrying the given meaning. */
  readonly encodeActionId: (ref: ActionIdRef) => string;
  /** The Slack surface kind this tree is being rendered into. */
  readonly surfaceKind: SurfaceKind;
}

/** The signature every `src/components/<name>/<name>.ts` entry implements. */
export type ComponentRenderer<T extends ComponentType> = (
  node: Extract<ResolvedComponent, { type: T }>,
  context: RenderContext,
) => RenderResult;
