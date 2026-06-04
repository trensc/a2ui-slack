import { DataContext } from '@a2ui/web_core/v0_9';
import { resolveDataPath } from './data-path.js';

/**
 * Coercion + binding helpers over `DataContext.resolveDynamicValue`. web_core
 * types raw A2UI props as `Record<string, unknown>` once we narrow them, and
 * `resolveDynamicValue` returns the caller-declared `V` from data we do not own,
 * so every result is funnelled through an explicit coercion to the strict
 * primitive the `ResolvedComponent` field requires (never letting `any`/`unknown`
 * leak into the returned tree).
 */

/** Narrow an unknown raw prop to a `{ path }` data binding if it is one. */
function asPathBinding(raw: unknown): { readonly path: string } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const candidate = raw as { path?: unknown };
  return typeof candidate.path === 'string' ? { path: candidate.path } : undefined;
}

/**
 * The absolute write-back JSON pointer for an input's `value`. Only `{path}`
 * bindings are writable; literals and `{call}` values resolve to `''` (the
 * renderer encodes an empty pointer, i.e. no two-way write-back).
 */
export function writeBackPath(basePath: string, rawValue: unknown): string {
  const binding = asPathBinding(rawValue);
  return binding ? resolveDataPath(basePath, binding.path) : '';
}

/** Resolve a raw dynamic value against a context, defaulting `undefined`/`null`. */
function resolve(context: DataContext, raw: unknown): unknown {
  if (raw === undefined || raw === null) return undefined;
  // `resolveDynamicValue<unknown>` keeps the result `unknown`; we coerce below.
  return context.resolveDynamicValue<unknown>(raw as never);
}

/**
 * Stringify a resolved `unknown` deterministically. Primitives use `String`;
 * objects/arrays are JSON-encoded so we never leak `[object Object]` into the
 * rendered tree (a corrupt binding shows its data rather than a useless token).
 */
function stringify(value: unknown): string {
  if (value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- primitive only here.
  return String(value);
}

/** Resolve to a string, defaulting to `fallback` when absent. */
export function resolveString(context: DataContext, raw: unknown, fallback = ''): string {
  const value = resolve(context, raw);
  return value === undefined ? fallback : stringify(value);
}

/** Resolve to a number, defaulting to `fallback` when absent or non-numeric. */
export function resolveNumber(
  context: DataContext,
  raw: unknown,
  fallback: number,
): number {
  const value = resolve(context, raw);
  if (value === undefined) return fallback;
  const coerced = Number(value);
  return Number.isNaN(coerced) ? fallback : coerced;
}

/** Resolve to a boolean (JS truthiness of the resolved value). */
export function resolveBoolean(context: DataContext, raw: unknown): boolean {
  return Boolean(resolve(context, raw));
}

/** Resolve to a string array; non-arrays become a single-element or empty list. */
export function resolveStringList(context: DataContext, raw: unknown): readonly string[] {
  const value = resolve(context, raw);
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.map((entry: unknown) => stringify(entry));
  return [stringify(value)];
}

/** Resolve a raw value to an unknown array (for templates / option lists). */
export function resolveArray(context: DataContext, raw: unknown): readonly unknown[] {
  const value = resolve(context, raw);
  return Array.isArray(value) ? value : [];
}
