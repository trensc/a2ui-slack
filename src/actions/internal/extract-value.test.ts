import { describe, expect, it } from 'vitest';
import { extractValue } from './extract-value.js';

describe('extractValue', () => {
  it('reads a plain_text_input string, null when absent', () => {
    expect(extractValue({ type: 'plain_text_input', value: 'hi' })).toBe('hi');
    expect(extractValue({ type: 'plain_text_input', value: null })).toBeNull();
    expect(extractValue({ type: 'plain_text_input' })).toBeNull();
  });

  it('reads checkboxes / multi_static_select as a value array (empty when none)', () => {
    expect(
      extractValue({
        type: 'checkboxes',
        selected_options: [{ value: 'a' }, { value: 'b' }],
      }),
    ).toEqual(['a', 'b']);
    expect(
      extractValue({ type: 'multi_static_select', selected_options: [{ value: 'x' }] }),
    ).toEqual(['x']);
    expect(extractValue({ type: 'checkboxes' })).toEqual([]);
  });

  it('reads radio_buttons / static_select single value, null when cleared', () => {
    expect(extractValue({ type: 'radio_buttons', selected_option: { value: 'r' } })).toBe(
      'r',
    );
    expect(extractValue({ type: 'radio_buttons' })).toBeNull();
    expect(extractValue({ type: 'static_select', selected_option: { value: 's' } })).toBe(
      's',
    );
    expect(extractValue({ type: 'static_select', selected_option: null })).toBeNull();
    expect(extractValue({ type: 'static_select' })).toBeNull();
  });

  it('reads datepicker / timepicker, null when cleared', () => {
    expect(extractValue({ type: 'datepicker', selected_date: '2026-06-05' })).toBe(
      '2026-06-05',
    );
    expect(extractValue({ type: 'datepicker' })).toBeNull();
    expect(extractValue({ type: 'timepicker', selected_time: '09:30' })).toBe('09:30');
    expect(extractValue({ type: 'timepicker' })).toBeNull();
  });

  it('reads a button / overflow value, null when absent', () => {
    expect(extractValue({ type: 'button', value: '2' })).toBe('2');
    expect(extractValue({ type: 'button' })).toBeNull();
    expect(extractValue({ type: 'overflow', value: '3' })).toBe('3');
    expect(extractValue({ type: 'overflow' })).toBeNull();
  });

  it('returns undefined for an unknown element type (caller skips it)', () => {
    expect(extractValue({ type: 'rich_text_input', value: 'x' })).toBeUndefined();
  });
});
