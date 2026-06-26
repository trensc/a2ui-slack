import { describe, expect, it } from 'vitest';
import {
  ActionSchema,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_MIN_INTERVAL_MS,
  DynamicStringSchema,
  HARD_MIN_INTERVAL_FLOOR_MS,
  clip,
  decodeActionId,
  emptyRegistry,
  encodeActionId,
  fallbackResult,
  renderComponent,
  resolveTree,
  z,
} from './index.js';

describe('public barrel', () => {
  it('re-exports the codec, dispatch, fallback, resolveTree and clip as callables', () => {
    for (const fn of [
      encodeActionId,
      decodeActionId,
      renderComponent,
      fallbackResult,
      resolveTree,
      clip,
    ]) {
      expect(typeof fn).toBe('function');
    }
    expect(emptyRegistry.byToken.size).toBe(0);
  });

  it('re-exports the scheduler default constants', () => {
    expect(DEFAULT_MIN_INTERVAL_MS).toBe(1000);
    expect(DEFAULT_DEBOUNCE_MS).toBe(50);
    expect(HARD_MIN_INTERVAL_FLOOR_MS).toBe(250);
  });

  it('re-exports schema-authoring helpers for custom-component props', () => {
    // `z` is callable and builds an object schema.
    expect(typeof z.object).toBe('function');
    // ActionSchema accepts the A2UI v0.9 {event:{name}} shape custom actions use.
    expect(ActionSchema.safeParse({ event: { name: 'deploy' } }).success).toBe(true);
    // DynamicStringSchema accepts a {path} write-back binding and a literal.
    expect(DynamicStringSchema.safeParse({ path: '/x' }).success).toBe(true);
    expect(DynamicStringSchema.safeParse('literal').success).toBe(true);
  });
});
