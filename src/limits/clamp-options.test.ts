import { describe, it, expect } from 'vitest';
import type { Option } from '@slack/types';
import {
  clampOptions,
  RADIO_OPTION_MAX,
  SELECT_OPTION_MAX,
  OPTION_TEXT_MAX,
} from './clamp-options.js';

function option(text: string): Option {
  return { text: { type: 'plain_text', text }, value: 'v' };
}

function options(count: number, text = 'ok'): Option[] {
  return Array.from({ length: count }, () => option(text));
}

describe('clamp-options constants', () => {
  it('exports the Slack option count and text limits', () => {
    expect(RADIO_OPTION_MAX).toBe(10);
    expect(SELECT_OPTION_MAX).toBe(100);
    expect(OPTION_TEXT_MAX).toBe(150);
  });
});

describe('clampOptions count caps', () => {
  it('returns empty with no overflow for an empty list', () => {
    const result = clampOptions([], RADIO_OPTION_MAX);
    expect(result.options).toEqual([]);
    expect(result.overflowed).toBe(false);
  });

  it('leaves a radio list exactly at the cap unchanged, no overflow', () => {
    const result = clampOptions(options(RADIO_OPTION_MAX), RADIO_OPTION_MAX);
    expect(result.options).toHaveLength(RADIO_OPTION_MAX);
    expect(result.overflowed).toBe(false);
  });

  it('drops radio options one over the cap and flags overflow', () => {
    const result = clampOptions(options(RADIO_OPTION_MAX + 1), RADIO_OPTION_MAX);
    expect(result.options).toHaveLength(RADIO_OPTION_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('leaves a select list exactly at the cap unchanged, no overflow', () => {
    const result = clampOptions(options(SELECT_OPTION_MAX), SELECT_OPTION_MAX);
    expect(result.options).toHaveLength(SELECT_OPTION_MAX);
    expect(result.overflowed).toBe(false);
  });

  it('drops select options one over the cap and flags overflow', () => {
    const result = clampOptions(options(SELECT_OPTION_MAX + 1), SELECT_OPTION_MAX);
    expect(result.options).toHaveLength(SELECT_OPTION_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('clamps to empty without throwing when max is 0', () => {
    const result = clampOptions(options(3), 0);
    expect(result.options).toEqual([]);
    expect(result.overflowed).toBe(true);
  });

  it('clamps to empty without throwing when max is negative', () => {
    const result = clampOptions(options(3), -5);
    expect(result.options).toEqual([]);
    expect(result.overflowed).toBe(true);
  });

  it('does not flag overflow when an empty list meets a zero max', () => {
    const result = clampOptions([], 0);
    expect(result.options).toEqual([]);
    expect(result.overflowed).toBe(false);
  });
});

describe('clampOptions text clipping', () => {
  it('leaves option text exactly at the limit unchanged, no overflow', () => {
    const text = 'x'.repeat(OPTION_TEXT_MAX);
    const result = clampOptions([option(text)], RADIO_OPTION_MAX);
    expect(result.options[0]?.text.text).toBe(text);
    expect(result.overflowed).toBe(false);
  });

  it('clips option text one over the limit and flags overflow', () => {
    const result = clampOptions(
      [option('x'.repeat(OPTION_TEXT_MAX + 1))],
      RADIO_OPTION_MAX,
    );
    expect(result.options[0]?.text.text.length).toBe(OPTION_TEXT_MAX);
    expect(result.options[0]?.text.text.endsWith('…')).toBe(true);
    expect(result.overflowed).toBe(true);
  });

  it('preserves option value and text type while clipping', () => {
    const result = clampOptions([option('short')], RADIO_OPTION_MAX);
    expect(result.options[0]?.value).toBe('v');
    expect(result.options[0]?.text.type).toBe('plain_text');
  });

  it('preserves the mrkdwn text type while clipping', () => {
    const mrkdwn: Option = {
      text: { type: 'mrkdwn', text: 'x'.repeat(OPTION_TEXT_MAX + 1) },
      value: 'm',
    };
    const result = clampOptions([mrkdwn], RADIO_OPTION_MAX);
    expect(result.options[0]?.text.type).toBe('mrkdwn');
    expect(result.options[0]?.text.text.length).toBe(OPTION_TEXT_MAX);
    expect(result.overflowed).toBe(true);
  });

  it('does not mutate the input options', () => {
    const input = [option('x'.repeat(OPTION_TEXT_MAX + 1))];
    clampOptions(input, RADIO_OPTION_MAX);
    expect(input[0]?.text.text.length).toBe(OPTION_TEXT_MAX + 1);
  });
});
