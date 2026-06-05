import type { SectionBlock, TextObject } from '@slack/types';
import type { RenderResult } from '../../render-context.js';
import { FIELD_TEXT_MAX } from '../../../limits/clamp-fields.js';

/**
 * A child result that can join a 2-up `section.fields` collapse: exactly one
 * `section` block whose `text` is set and which carries no `fields` or
 * `accessory` (i.e. a simple key/value text cell). Anything else forces the row
 * to fall back to a vertical stack.
 */
export function collapsibleFieldOf(child: RenderResult): TextObject | undefined {
  if (child.blocks.length !== 1) return undefined;
  const block = child.blocks[0];
  if (block === undefined || block.type !== 'section') return undefined;
  const section: SectionBlock = block;
  if (section.text === undefined) return undefined;
  if (section.fields !== undefined) return undefined;
  if (section.accessory !== undefined) return undefined;
  return section.text;
}

/** Clip a 2-up field's text to Slack's 2000-char-per-field limit. */
export function clipFieldText(
  field: TextObject,
  clip: (t: string, m: number) => string,
): TextObject {
  return { ...field, text: clip(field.text, FIELD_TEXT_MAX) };
}
