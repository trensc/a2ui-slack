/**
 * JSON-pointer path joining for the surface binder. A2UI data paths are either
 * absolute (start with '/') or relative to the current component scope; this
 * mirrors how `DataContext` resolves them so the write-back pointers we emit
 * line up with the contexts we resolve against.
 */

/**
 * Resolve a (possibly relative) data path against an absolute base path. The
 * base path is always absolute (the walk starts at the root scope '/'), so the
 * only special case is the root itself, where we must avoid a doubled '//'.
 */
export function resolveDataPath(basePath: string, raw: string): string {
  if (raw.startsWith('/')) return raw;
  if (basePath === '/') return `/${raw}`;
  return `${basePath}/${raw}`;
}

/** Append an array index to an absolute base path (e.g. '/items' + 0 → '/items/0'). */
export function indexPath(basePath: string, index: number): string {
  if (basePath === '/') return `/${String(index)}`;
  return `${basePath}/${String(index)}`;
}
