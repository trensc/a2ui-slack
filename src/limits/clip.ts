/**
 * Clip text to a maximum length, appending an ellipsis when truncated so the
 * result is always at most `max` characters. Slack rejects the whole message if
 * a single field exceeds its limit, so callers clamp at the render edge.
 */
export function clip(text: string, max: number): string {
  if (max <= 0) return '';
  if (text.length <= max) return text;
  // max === 1 falls through correctly: slice(0, 0) + '…' === '…'.
  return `${text.slice(0, max - 1)}…`;
}
