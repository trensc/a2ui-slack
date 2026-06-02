import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_MIN_INTERVAL_MS,
  HARD_MIN_INTERVAL_FLOOR_MS,
  clip,
  decodeActionId,
  emptyRegistry,
  encodeActionId,
  fallbackResult,
  renderComponent,
  resolveTree,
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
});
