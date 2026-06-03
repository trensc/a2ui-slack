import { describe, it, expect } from 'vitest';
import {
  clampElements,
  ACTIONS_ELEMENT_MAX,
  CONTEXT_ELEMENT_MAX,
} from './clamp-elements.js';

function elements(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

describe('clamp-elements constants', () => {
  it('exports the Slack element-count limits', () => {
    expect(ACTIONS_ELEMENT_MAX).toBe(25);
    expect(CONTEXT_ELEMENT_MAX).toBe(10);
  });
});

describe('clampElements', () => {
  it('returns empty with no overflow for an empty list', () => {
    const result = clampElements([], ACTIONS_ELEMENT_MAX);
    expect(result.elements).toEqual([]);
    expect(result.overflowed).toBe(false);
  });

  it('leaves an actions list exactly at the cap unchanged, no overflow', () => {
    const result = clampElements(elements(ACTIONS_ELEMENT_MAX), ACTIONS_ELEMENT_MAX);
    expect(result.elements).toHaveLength(ACTIONS_ELEMENT_MAX);
    expect(result.overflowed).toBe(false);
  });

  it('drops actions elements one over the cap and flags overflow', () => {
    const result = clampElements(elements(ACTIONS_ELEMENT_MAX + 1), ACTIONS_ELEMENT_MAX);
    expect(result.elements).toHaveLength(ACTIONS_ELEMENT_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('leaves a context list exactly at the cap unchanged, no overflow', () => {
    const result = clampElements(elements(CONTEXT_ELEMENT_MAX), CONTEXT_ELEMENT_MAX);
    expect(result.elements).toHaveLength(CONTEXT_ELEMENT_MAX);
    expect(result.overflowed).toBe(false);
  });

  it('drops context elements one over the cap and flags overflow', () => {
    const result = clampElements(elements(CONTEXT_ELEMENT_MAX + 1), CONTEXT_ELEMENT_MAX);
    expect(result.elements).toHaveLength(CONTEXT_ELEMENT_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('clamps to empty without throwing when max is 0', () => {
    const result = clampElements(elements(3), 0);
    expect(result.elements).toEqual([]);
    expect(result.overflowed).toBe(true);
  });

  it('clamps to empty without throwing when max is negative', () => {
    const result = clampElements(elements(3), -5);
    expect(result.elements).toEqual([]);
    expect(result.overflowed).toBe(true);
  });

  it('does not flag overflow when an empty list meets a zero max', () => {
    const result = clampElements([], 0);
    expect(result.elements).toEqual([]);
    expect(result.overflowed).toBe(false);
  });

  it('does not mutate the input array', () => {
    const input = elements(ACTIONS_ELEMENT_MAX + 1);
    clampElements(input, ACTIONS_ELEMENT_MAX);
    expect(input).toHaveLength(ACTIONS_ELEMENT_MAX + 1);
  });

  it('returns a fresh array even when nothing is dropped', () => {
    const input = elements(2);
    const result = clampElements(input, ACTIONS_ELEMENT_MAX);
    expect(result.elements).not.toBe(input);
  });
});
