/**
 * The structured meaning carried inside a Slack `action_id` / `block_id`.
 *
 * Slack collapses two distinct A2UI semantics into one `block_actions` payload,
 * so the verb must travel in the id itself:
 *
 * - `input`  → a two-way binding write. Inbound becomes `dataModel.set(path, v)`,
 *   no server round-trip. Requires `path` (the JSON Pointer to write).
 * - `action` → a server action. Inbound fires the component's action closure,
 *   which emits an A2UI `action` message. `path` is unused.
 *
 * The encoder (used by `src/components/`) and decoder (used by `src/actions/`)
 * share this type. Both must respect Slack's 255-char limit on `action_id`;
 * see the codec module for the long-id fallback strategy.
 */
export type ActionKind = 'input' | 'action';

export interface ActionIdRef {
  readonly kind: ActionKind;
  readonly surfaceId: string;
  readonly componentId: string;
  /** JSON Pointer to write — required when `kind === 'input'`. */
  readonly path?: string;
  /** Resolved A2UI action value; disambiguates multi-action custom components. */
  readonly action?: string;
  /** Set for custom-component callbacks so inbound can find a per-param extractor. */
  readonly custom?: { readonly component: string; readonly param: string };
}
