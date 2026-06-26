/**
 * The pure description of what an inbound Slack interaction means in A2UI terms.
 *
 * `src/actions/` decodes a Slack `block_actions` / `view_submission` payload into
 * a list of these effects — it does NOT execute them (no `dataModel`, no network
 * here, that stays pure). The impure consumer applies them: `setData` →
 * `dataModel.set`, `fireAction` → invoke the component's action closure (which
 * emits the A2UI `action` message).
 *
 * Ordering matters: for a modal submit, ALL `setData` effects are emitted before
 * any `fireAction`, so the action's context resolves against an up-to-date model.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type InboundEffect =
  | {
      readonly kind: 'setData';
      readonly surfaceId: string;
      readonly path: string;
      readonly value: JsonValue;
    }
  | {
      readonly kind: 'fireAction';
      readonly surfaceId: string;
      readonly componentId: string;
      /** Resolved A2UI action value (custom multi-action). Absent for single-action built-ins. */
      readonly action?: string;
    };

/**
 * A loss on the inbound decode path that has no `InboundEffect` to carry it: a
 * custom input extractor threw and was sandboxed (its write may be lost). Returned,
 * never logged — observability is the host's job (the core stays pure).
 */
export interface InboundDiagnostic {
  readonly kind: 'extractorThrew';
  readonly surfaceId: string;
  readonly componentId: string;
  readonly path?: string;
  readonly custom?: { readonly component: string; readonly param: string };
  readonly reason: string;
}

/**
 * The output of `interpretPayload`: the pure effects to apply, plus any decode-time
 * diagnostics. Mirrors `RenderResult { blocks, degradations }` on the outbound path.
 */
export interface InboundResult {
  readonly effects: readonly InboundEffect[];
  readonly diagnostics: readonly InboundDiagnostic[];
}
