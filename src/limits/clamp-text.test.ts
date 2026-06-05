import { describe, it, expect } from 'vitest';
import {
  clampSectionText,
  clampHeaderText,
  clampButtonText,
  SECTION_TEXT_MAX,
  HEADER_TEXT_MAX,
  BUTTON_TEXT_MAX,
  INPUT_LABEL_MAX,
} from './clamp-text.js';

describe('clamp-text constants', () => {
  it('exports the Slack text slot limits', () => {
    expect(SECTION_TEXT_MAX).toBe(3000);
    expect(HEADER_TEXT_MAX).toBe(150);
    expect(BUTTON_TEXT_MAX).toBe(75);
    expect(INPUT_LABEL_MAX).toBe(2000);
  });
});

describe('clampSectionText', () => {
  it('returns text unchanged when exactly at the limit', () => {
    const text = 'x'.repeat(SECTION_TEXT_MAX);
    const result = clampSectionText(text);
    expect(result).toBe(text);
    expect(result.length).toBe(SECTION_TEXT_MAX);
  });

  it('clips when one over the limit', () => {
    const result = clampSectionText('x'.repeat(SECTION_TEXT_MAX + 1));
    expect(result.length).toBe(SECTION_TEXT_MAX);
    expect(result.endsWith('…')).toBe(true);
  });

  it('passes an empty string through unchanged', () => {
    expect(clampSectionText('')).toBe('');
  });
});

describe('clampHeaderText', () => {
  it('returns text unchanged when exactly at the limit', () => {
    const text = 'x'.repeat(HEADER_TEXT_MAX);
    expect(clampHeaderText(text)).toBe(text);
  });

  it('clips when one over the limit', () => {
    const result = clampHeaderText('x'.repeat(HEADER_TEXT_MAX + 1));
    expect(result.length).toBe(HEADER_TEXT_MAX);
    expect(result.endsWith('…')).toBe(true);
  });

  it('passes an empty string through unchanged', () => {
    expect(clampHeaderText('')).toBe('');
  });
});

describe('clampButtonText', () => {
  it('returns text unchanged when exactly at the limit', () => {
    const text = 'x'.repeat(BUTTON_TEXT_MAX);
    expect(clampButtonText(text)).toBe(text);
  });

  it('clips when one over the limit', () => {
    const result = clampButtonText('x'.repeat(BUTTON_TEXT_MAX + 1));
    expect(result.length).toBe(BUTTON_TEXT_MAX);
    expect(result.endsWith('…')).toBe(true);
  });

  it('passes an empty string through unchanged', () => {
    expect(clampButtonText('')).toBe('');
  });
});
