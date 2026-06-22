import { decodeActionId } from '../action-id/action-id.js';
import type { TokenRegistry } from '../action-id/action-id.js';
import type { ActionIdRef } from '../action-id/action-id-ref.js';
import type { InboundEffect, JsonValue } from './inbound-effect.js';
import { extractValue } from './internal/extract-value.js';
import type { InboundElement } from './internal/extract-value.js';
import type { CustomComponentRegistry } from '../components/custom/custom-component.js';

// Re-exported as this module's public entry for `InboundElement`: cross-module
// consumers (e.g. custom-component extractors) must not reach into `internal/`.
export type { InboundElement } from './internal/extract-value.js';

/** A `block_actions` payload: discrete element interactions in a message. */
export interface BlockActionsPayload {
  readonly type: 'block_actions';
  readonly actions: readonly InboundElement[];
}

/** A `view_submission` payload: a modal submit with all input state (V2 surface). */
export interface ViewSubmissionPayload {
  readonly type: 'view_submission';
  readonly view: {
    readonly state: {
      readonly values: Readonly<Record<string, Readonly<Record<string, InboundElement>>>>;
    };
  };
}

export type SlackInteractionPayload = BlockActionsPayload | ViewSubmissionPayload;

/**
 * Interpret a Slack interaction payload as a pure list of [[InboundEffect]]s — it
 * never touches a `DataModel` or the network (the consumer applies the effects).
 * The per-surface token `registry` is required to decode each `action_id` back to
 * its `ActionIdRef`. Undecodable ids and unknown element types are skipped, never
 * thrown. `setData` effects always precede `fireAction` effects so an action's
 * context resolves against an up-to-date model.
 *
 * `custom` is consulted for per-param value extractors only — render functions are
 * never invoked here; the decode path stays pure.
 */
export function interpretPayload(
  payload: SlackInteractionPayload,
  registry: TokenRegistry,
  custom?: CustomComponentRegistry,
): readonly InboundEffect[] {
  if (payload.type === 'view_submission')
    return fromViewSubmission(payload, registry, custom);
  return fromBlockActions(payload, registry, custom);
}

function fromBlockActions(
  payload: BlockActionsPayload,
  registry: TokenRegistry,
  custom?: CustomComponentRegistry,
): readonly InboundEffect[] {
  const setData: InboundEffect[] = [];
  const fireAction: InboundEffect[] = [];
  for (const element of payload.actions) {
    addEffect(element.action_id ?? '', element, registry, setData, fireAction, custom);
  }
  return [...setData, ...fireAction];
}

/**
 * A modal submit carries every input's state but no fired action, so we emit only
 * `setData` effects here; the consumer fires the submit button's action afterwards
 * (kept out of V1 — see task F). Ordering is therefore trivially satisfied.
 */
function fromViewSubmission(
  payload: ViewSubmissionPayload,
  registry: TokenRegistry,
  custom?: CustomComponentRegistry,
): readonly InboundEffect[] {
  const setData: InboundEffect[] = [];
  for (const elements of Object.values(payload.view.state.values)) {
    for (const [actionId, element] of Object.entries(elements)) {
      addEffect(actionId, element, registry, setData, [], custom);
    }
  }
  return setData;
}

/** Decode one element (by its action_id) and push its effect into the right bucket; `custom` supplies per-param value extractors for custom-component inputs. */
function addEffect(
  actionId: string,
  element: InboundElement,
  registry: TokenRegistry,
  setData: InboundEffect[],
  fireAction: InboundEffect[],
  custom?: CustomComponentRegistry,
): void {
  const decoded = decodeActionId(actionId, registry);
  if (!decoded.ok) return;
  const ref = decoded.ref;
  if (ref.kind === 'action') {
    fireAction.push(toFireAction(ref));
    return;
  }
  // Explicit branch (NOT `??`): a custom extractor returning `null` is an intentional
  // "cleared" value and must be kept, not fall through to the built-in extractor.
  const fromCustom = customExtract(ref, element, custom);
  const value = fromCustom !== undefined ? fromCustom : extractValue(element);
  // `path` is `undefined` (no write target) or `''` (literal value, no `{path}` binding):
  // both mean no write-back, so skip rather than corrupt the data-model root.
  if (value === undefined || ref.path === undefined || ref.path === '') return;
  setData.push({ kind: 'setData', surfaceId: ref.surfaceId, path: ref.path, value });
}

/** Build a fireAction effect, carrying the resolved A2UI action value only when present. */
function toFireAction(ref: ActionIdRef): InboundEffect {
  const base = {
    kind: 'fireAction' as const,
    surfaceId: ref.surfaceId,
    componentId: ref.componentId,
  };
  return ref.action === undefined ? base : { ...base, action: ref.action };
}

/**
 * Resolve a custom per-param extractor for this ref, if one is registered.
 * Integrator code (`extract`) is sandboxed: a throw is caught and treated as
 * `undefined` (defer to the built-in extractor) so one buggy extractor can never
 * crash the whole inbound decode. The decode path has no degradation channel, so
 * the failure is silent here — surface it via the host if observability is needed.
 */
function customExtract(
  ref: ActionIdRef,
  element: InboundElement,
  custom?: CustomComponentRegistry,
): JsonValue | undefined {
  if (ref.custom === undefined || custom === undefined) return undefined;
  const extractor = custom.get(ref.custom.component)?.component.inputs?.[ref.custom.param]
    ?.extract;
  if (extractor === undefined) return undefined;
  try {
    return extractor(element);
  } catch {
    return undefined;
  }
}
