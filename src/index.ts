// Public API surface — re-exports only. Implementation lives in the domain modules.

// action_id codec
export { decodeActionId, emptyRegistry, encodeActionId } from './action-id/action-id.js';
export type { DecodeResult, EncodeResult, TokenRegistry } from './action-id/action-id.js';
export type { ActionIdRef, ActionKind } from './action-id/action-id-ref.js';

// component rendering
export { renderComponent } from './components/render-component.js';
export { fallbackResult } from './components/fallback.js';
export type {
  ChoiceOption,
  ComponentType,
  ResolvedComponent,
  ResolvedOf,
  TextVariant,
} from './components/resolved-component.js';
export type {
  ComponentRenderer,
  DegradationReport,
  RenderContext,
  RenderResult,
} from './components/render-context.js';

// surface
export { resolveTree } from './surface/resolve-tree.js';
export type { ResolveTreeInput } from './surface/resolve-tree.js';
export { resolveSurface } from './surface/resolve-surface.js';
export type { ResolvedTree } from './surface/resolved-tree.js';
export { assembleSurface } from './surface/assemble-surface.js';
export type {
  AssembleSurfaceInput,
  AssembledSurface,
} from './surface/assemble-surface.js';
export {
  OMITTED_COMPONENTS,
  SLACK_CATALOG_ID,
  buildCapabilities,
} from './surface/capabilities.js';
export type { SurfaceKind, SurfaceTarget } from './surface/surface-target.js';

// inbound effects
export type { InboundEffect, JsonValue } from './actions/inbound-effect.js';
export { interpretPayload } from './actions/interpret-payload.js';
export type {
  BlockActionsPayload,
  SlackInteractionPayload,
  ViewSubmissionPayload,
} from './actions/interpret-payload.js';

// scheduler
export {
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_MIN_INTERVAL_MS,
  HARD_MIN_INTERVAL_FLOOR_MS,
} from './scheduler/flush-decision.js';
export type {
  FlushConfig,
  FlushDecision,
  SchedulerState,
} from './scheduler/flush-decision.js';

// limits
export { clip } from './limits/clip.js';
