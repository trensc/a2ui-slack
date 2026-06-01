/**
 * Where a single A2UI surface is materialised on Slack.
 *
 * The renderer core is pure and never talks to Slack — it only produces blocks.
 * This type is the contract the impure consumer (in `examples/`) uses to route a
 * `surfaceId` to a concrete Slack destination (a posted message, an open modal
 * view, or the App Home). The core reads `kind` to decide message-only vs
 * view-only Block Kit behaviour (e.g. text inputs use `dispatch_action` in a
 * message, a submit button in a view).
 */
export type SurfaceKind = 'message' | 'modal' | 'home';

export interface SurfaceTarget {
  readonly kind: SurfaceKind;
  /** Channel id — present for `message` and `home`. */
  readonly channel?: string;
  /** Timestamp of the posted message — present once a `message` surface exists. */
  readonly messageTs?: string;
  /** View id — present once a `modal`/`home` view is open. */
  readonly viewId?: string;
}
