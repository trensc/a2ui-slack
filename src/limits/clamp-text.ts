import { clip } from './clip.js';

/** Maximum length of a `section.text` (mrkdwn/plain) field. */
export const SECTION_TEXT_MAX = 3000;
/** Maximum length of a `header.text` (plain_text) field. */
export const HEADER_TEXT_MAX = 150;
/** Maximum length of a `button.text` field. */
export const BUTTON_TEXT_MAX = 75;
/** Maximum length of an `input` block's `label` (plain_text). */
export const INPUT_LABEL_MAX = 2000;

/** Clip text destined for a `section.text` slot to Slack's 3000-char limit. */
export function clampSectionText(text: string): string {
  return clip(text, SECTION_TEXT_MAX);
}

/** Clip text destined for a `header.text` slot to Slack's 150-char limit. */
export function clampHeaderText(text: string): string {
  return clip(text, HEADER_TEXT_MAX);
}

/** Clip text destined for a `button.text` slot to Slack's 75-char limit. */
export function clampButtonText(text: string): string {
  return clip(text, BUTTON_TEXT_MAX);
}
