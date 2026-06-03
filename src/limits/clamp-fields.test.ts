import { describe, it, expect } from 'vitest';
import type { TextObject } from '@slack/types';
import { clampFields, SECTION_FIELD_MAX, FIELD_TEXT_MAX } from './clamp-fields.js';

function field(text: string): TextObject {
  return { type: 'mrkdwn', text };
}

function fields(count: number, text = 'ok'): TextObject[] {
  return Array.from({ length: count }, () => field(text));
}

describe('clamp-fields constants', () => {
  it('exports the Slack section.fields limits', () => {
    expect(SECTION_FIELD_MAX).toBe(10);
    expect(FIELD_TEXT_MAX).toBe(2000);
  });
});

describe('clampFields', () => {
  it('leaves a list exactly at the count limit unchanged, no overflow', () => {
    const result = clampFields(fields(SECTION_FIELD_MAX));
    expect(result.fields).toHaveLength(SECTION_FIELD_MAX);
    expect(result.overflowed).toBe(false);
  });

  it('drops fields one over the count limit and flags overflow', () => {
    const result = clampFields(fields(SECTION_FIELD_MAX + 1));
    expect(result.fields).toHaveLength(SECTION_FIELD_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('leaves text exactly at the text limit unchanged, no overflow', () => {
    const text = 'x'.repeat(FIELD_TEXT_MAX);
    const result = clampFields([field(text)]);
    expect(result.fields[0]?.text).toBe(text);
    expect(result.overflowed).toBe(false);
  });

  it('clips text one over the text limit and flags overflow', () => {
    const result = clampFields([field('x'.repeat(FIELD_TEXT_MAX + 1))]);
    expect(result.fields[0]?.text.length).toBe(FIELD_TEXT_MAX);
    expect(result.fields[0]?.text.endsWith('…')).toBe(true);
    expect(result.overflowed).toBe(true);
  });

  it('returns an empty list with no overflow for empty input', () => {
    const result = clampFields([]);
    expect(result.fields).toEqual([]);
    expect(result.overflowed).toBe(false);
  });

  it('preserves the field type while clipping', () => {
    const result = clampFields([{ type: 'plain_text', text: 'short' }]);
    expect(result.fields[0]?.type).toBe('plain_text');
  });

  it('does not mutate the input fields', () => {
    const input = [field('x'.repeat(FIELD_TEXT_MAX + 1))];
    clampFields(input);
    expect(input[0]?.text.length).toBe(FIELD_TEXT_MAX + 1);
  });
});
