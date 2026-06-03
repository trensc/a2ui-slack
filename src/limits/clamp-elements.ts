/** Maximum elements in an `actions` block. */
export const ACTIONS_ELEMENT_MAX = 25;
/** Maximum elements in a `context` block. */
export const CONTEXT_ELEMENT_MAX = 10;

/** The result of clamping an element list to a count limit. */
export interface ClampElementsResult<T> {
  /** The elements, capped at `max`. A fresh array; inputs are not mutated. */
  readonly elements: readonly T[];
  /** True when the input exceeded `max` and elements were dropped. */
  readonly overflowed: boolean;
}

/**
 * Truncate an element list to at most `max` elements. The caller passes the cap
 * for the block kind (`ACTIONS_ELEMENT_MAX` or `CONTEXT_ELEMENT_MAX`). Pure:
 * never mutates the input; signals `overflowed` so the caller can report drops.
 */
export function clampElements<T>(
  elements: readonly T[],
  max: number,
): ClampElementsResult<T> {
  const limit = max > 0 ? max : 0;
  if (elements.length <= limit) {
    return { elements: elements.slice(), overflowed: false };
  }
  return { elements: elements.slice(0, limit), overflowed: true };
}
