/**
 * Pure decision for when to push the next `chat.update` for a surface.
 *
 * Slack's binding constraint is ~1 update/s/channel (bursts tolerated); 429
 * returns a `Retry-After`. This module owns ONLY the timing maths — no timers,
 * no network, no clock. The impure consumer reads the clock, arms timers, calls
 * Slack, and feeds `Retry-After` back in via `backoffUntil`.
 *
 * Strategy encoded here: leading-edge flush, trailing debounce to coalesce a
 * keystroke burst, and a `minIntervalMs` rate floor. Coalescing is last-write-
 * wins (the consumer keeps only the latest desired snapshot), so there is no
 * queue — this only answers "flush now, or wait how long?".
 */
export interface FlushConfig {
  /** Rate floor between two updates. Default 1000ms; clamped to a hard floor. */
  readonly minIntervalMs: number;
  /** Trailing debounce to absorb a burst. Default 50–80ms. */
  readonly debounceMs: number;
}

export interface SchedulerState {
  /** Clock value of the last successful flush, or null if never flushed. */
  readonly lastFlushAt: number | null;
  /** Clock value of the most recent pending change. */
  readonly lastChangeAt: number;
  /** Honour an active 429 backoff until this clock value, if any. */
  readonly backoffUntil: number | null;
}

export type FlushDecision =
  | { readonly action: 'flushNow' }
  | { readonly action: 'wait'; readonly delayMs: number };

export const DEFAULT_MIN_INTERVAL_MS = 1000;
export const DEFAULT_DEBOUNCE_MS = 50;
/** Lower bound enforced regardless of config, to prevent 429 storms. */
export const HARD_MIN_INTERVAL_FLOOR_MS = 250;
