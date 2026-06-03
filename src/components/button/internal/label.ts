import { clip } from '../../../limits/clip.js';

/** Slack's hard limit on `button.text`. Empty text is rejected outright. */
export const BUTTON_TEXT_MAX = 75;

/** Stand-in shown when an A2UI Button has an empty label — Slack rejects ''. */
export const PLACEHOLDER_LABEL = 'Button';

/** The clipped button text plus whether it was substituted for an empty label. */
export interface FormattedLabel {
  readonly text: string;
  readonly isPlaceholder: boolean;
}

/**
 * Produce Slack-safe button text: an empty label becomes a non-empty placeholder
 * (Slack rejects empty `button.text`), otherwise the label is clipped to 75.
 */
export function formatLabel(label: string): FormattedLabel {
  if (label.length === 0) {
    return { text: PLACEHOLDER_LABEL, isPlaceholder: true };
  }
  return { text: clip(label, BUTTON_TEXT_MAX), isPlaceholder: false };
}
