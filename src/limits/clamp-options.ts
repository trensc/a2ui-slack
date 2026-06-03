import type { Option } from '@slack/types';
import { clip } from './clip.js';

/** Maximum options for checkbox / radio_buttons elements. */
export const RADIO_OPTION_MAX = 10;
/** Maximum options for a static_select element. */
export const SELECT_OPTION_MAX = 100;
/** Maximum length of a single option's display text. */
export const OPTION_TEXT_MAX = 150;

/** The result of clamping an option list. */
export interface ClampOptionsResult {
  /** The options, capped at `max` with each text clipped. A fresh array. */
  readonly options: readonly Option[];
  /** True when any option was dropped (count over `max`) or any text was clipped. */
  readonly overflowed: boolean;
}

/**
 * Clamp an option list to Slack's limits: at most `max` options (the caller
 * passes `RADIO_OPTION_MAX` or `SELECT_OPTION_MAX` per element), each option
 * text at most 150 chars. Pure: builds new option objects, never mutates inputs,
 * never silently drops without signalling `overflowed`.
 */
export function clampOptions(
  options: readonly Option[],
  max: number,
): ClampOptionsResult {
  const limit = max > 0 ? max : 0;
  const dropped = options.length > limit;
  const kept = options.slice(0, limit);
  let clipped = false;
  const result = kept.map((option) => {
    const text = clip(option.text.text, OPTION_TEXT_MAX);
    if (text.length !== option.text.text.length) clipped = true;
    return clipOptionText(option, text);
  });
  return { options: result, overflowed: dropped || clipped };
}

/** Rebuild an option with new display text, preserving its text-type branch. */
function clipOptionText(option: Option, text: string): Option {
  if (option.text.type === 'mrkdwn') {
    return { ...option, text: { ...option.text, text } };
  }
  const { text: textObject, ...rest } = option;
  return { ...rest, text: { ...textObject, text } };
}
