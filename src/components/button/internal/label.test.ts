import { describe, expect, it } from 'vitest';
import { BUTTON_TEXT_MAX, PLACEHOLDER_LABEL, formatLabel } from './label.js';

describe('formatLabel', () => {
  it('passes a short label through untouched, not a placeholder', () => {
    expect(formatLabel('Save')).toEqual({ text: 'Save', isPlaceholder: false });
  });

  it('keeps a label exactly at the 75-char limit untouched', () => {
    const atLimit = 'a'.repeat(BUTTON_TEXT_MAX);
    const result = formatLabel(atLimit);
    expect(result.text).toBe(atLimit);
    expect(result.text.length).toBe(BUTTON_TEXT_MAX);
    expect(result.isPlaceholder).toBe(false);
  });

  it('clips a label over the limit to 75 chars with an ellipsis', () => {
    const overLimit = 'a'.repeat(BUTTON_TEXT_MAX + 5);
    const result = formatLabel(overLimit);
    expect(result.text.length).toBe(BUTTON_TEXT_MAX);
    expect(result.text.endsWith('…')).toBe(true);
    expect(result.isPlaceholder).toBe(false);
  });

  it('substitutes the placeholder for an empty label and flags it', () => {
    expect(formatLabel('')).toEqual({ text: PLACEHOLDER_LABEL, isPlaceholder: true });
  });
});
