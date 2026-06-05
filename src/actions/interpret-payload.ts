import { decodeActionId } from '../action-id/action-id.js';
import type { TokenRegistry } from '../action-id/action-id.js';
import type { InboundEffect } from './inbound-effect.js';
import { extractValue } from './internal/extract-value.js';
import type { InboundElement } from './internal/extract-value.js';

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
 */
export function interpretPayload(
  payload: SlackInteractionPayload,
  registry: TokenRegistry,
): readonly InboundEffect[] {
  if (payload.type === 'view_submission') {
    return fromViewSubmission(payload, registry);
  }
  return fromBlockActions(payload, registry);
}

function fromBlockActions(
  payload: BlockActionsPayload,
  registry: TokenRegistry,
): readonly InboundEffect[] {
  const setData: InboundEffect[] = [];
  const fireAction: InboundEffect[] = [];
  for (const element of payload.actions) {
    addEffect(element.action_id ?? '', element, registry, setData, fireAction);
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
): readonly InboundEffect[] {
  const setData: InboundEffect[] = [];
  for (const elements of Object.values(payload.view.state.values)) {
    for (const [actionId, element] of Object.entries(elements)) {
      addEffect(actionId, element, registry, setData, []);
    }
  }
  return setData;
}

/** Decode one element (by its action_id) and push its effect into the right bucket. */
function addEffect(
  actionId: string,
  element: InboundElement,
  registry: TokenRegistry,
  setData: InboundEffect[],
  fireAction: InboundEffect[],
): void {
  const decoded = decodeActionId(actionId, registry);
  if (!decoded.ok) return;
  const ref = decoded.ref;
  if (ref.kind === 'action') {
    fireAction.push({
      kind: 'fireAction',
      surfaceId: ref.surfaceId,
      componentId: ref.componentId,
    });
    return;
  }
  const value = extractValue(element);
  if (value === undefined || ref.path === undefined) return;
  setData.push({ kind: 'setData', surfaceId: ref.surfaceId, path: ref.path, value });
}
