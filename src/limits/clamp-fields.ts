import type { TextObject } from '@slack/types';
import { clip } from './clip.js';

/** Maximum number of `section.fields` Slack allows. */
export const SECTION_FIELD_MAX = 10;
/** Maximum length of each `section.fields` text. */
export const FIELD_TEXT_MAX = 2000;

/** The result of clamping a `section.fields` list. */
export interface ClampFieldsResult {
  /** The fields, capped at `SECTION_FIELD_MAX` with each text clipped. A fresh array. */
  readonly fields: readonly TextObject[];
  /** True when any field was dropped (count over cap) or any text was clipped. */
  readonly overflowed: boolean;
}

/**
 * Clamp a `section.fields` list to Slack's limits: at most 10 fields, each text
 * at most 2000 chars. Pure: builds new field objects and never mutates inputs.
 * Signals `overflowed` so the caller can emit a degradation report.
 */
export function clampFields(fields: readonly TextObject[]): ClampFieldsResult {
  const dropped = fields.length > SECTION_FIELD_MAX;
  const kept = fields.slice(0, SECTION_FIELD_MAX);
  let clipped = false;
  const result = kept.map((field) => {
    const text = clip(field.text, FIELD_TEXT_MAX);
    if (text.length !== field.text.length) clipped = true;
    return { ...field, text };
  });
  return { fields: result, overflowed: dropped || clipped };
}
