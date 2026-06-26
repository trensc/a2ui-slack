import type { ActionIdRef } from './action-id-ref.js';

/**
 * Lookup tables that turn a short, opaque Slack `action_id` back into the full
 * `ActionIdRef` it stands for. Slack only echoes the `action_id` (≤255 chars,
 * unique-in-block) on the way back, so we never inline the routing data: every
 * interactive element gets an `action_id` of `t|<n>` and the real meaning lives
 * here as the value.
 *
 * The registry is **per-surface and append-only**: a token, once assigned, maps
 * to the same ref for the life of that surface, so a click on a stale render
 * resolves to the correct component (or fails safe) and never mis-targets. The
 * consumer persists it across re-renders and threads it through `encodeActionId`.
 */
export interface TokenRegistry {
  /** token id (`t|<n>`) → the ref it encodes. */
  readonly byToken: ReadonlyMap<string, ActionIdRef>;
  /** canonical ref key → token id, so an identical ref reuses its token (dedup). */
  readonly byKey: ReadonlyMap<string, string>;
}

/** A fresh, empty registry to seed the first render of a surface. */
export const emptyRegistry: TokenRegistry = {
  byToken: new Map(),
  byKey: new Map(),
};

/** The id to send to Slack plus the (possibly grown) registry to persist. */
export interface EncodeResult {
  readonly id: string;
  readonly registry: TokenRegistry;
}

/** Decoding never throws on untrusted input — failure is a typed result. */
export type DecodeResult =
  | { readonly ok: true; readonly ref: ActionIdRef }
  | { readonly ok: false; readonly reason: string };

/**
 * Lossless, collision-free string identity for a ref. The array form means no
 * field separator can collide with id/path content — a wrong key would silently
 * merge two refs onto one token and mis-route the interaction.
 */
function canonicalKey(ref: ActionIdRef): string {
  return JSON.stringify([
    ref.kind,
    ref.surfaceId,
    ref.componentId,
    ref.path ?? null,
    ref.action ?? null,
    ref.custom ? [ref.custom.component, ref.custom.param] : null,
  ]);
}

/**
 * Encode a ref into a Slack-safe `action_id`. Reuses the existing token when the
 * same ref has already been seen (dedup); otherwise appends `t|<size>` and
 * returns a new registry — the input is never mutated.
 */
export function encodeActionId(ref: ActionIdRef, registry: TokenRegistry): EncodeResult {
  const key = canonicalKey(ref);
  const existing = registry.byKey.get(key);
  if (existing !== undefined) return { id: existing, registry };
  const id = `t|${String(registry.byToken.size)}`;
  return {
    id,
    registry: {
      byToken: new Map(registry.byToken).set(id, ref),
      byKey: new Map(registry.byKey).set(key, id),
    },
  };
}

/** Recover the ref an `action_id` stands for, or report why it cannot. */
export function decodeActionId(id: string, registry: TokenRegistry): DecodeResult {
  const ref = registry.byToken.get(id);
  if (ref === undefined) return { ok: false, reason: 'unknown token' };
  return { ok: true, ref };
}
