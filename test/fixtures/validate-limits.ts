import type { KnownBlock } from '@slack/types';
import { MESSAGE_BLOCK_MAX, VIEW_BLOCK_MAX } from '../../src/limits/clamp-blocks.js';
import {
  HEADER_TEXT_MAX,
  INPUT_LABEL_MAX,
  SECTION_TEXT_MAX,
} from '../../src/limits/clamp-text.js';
import { FIELD_TEXT_MAX, SECTION_FIELD_MAX } from '../../src/limits/clamp-fields.js';
import { OPTION_TEXT_MAX, SELECT_OPTION_MAX } from '../../src/limits/clamp-options.js';
import {
  ACTIONS_ELEMENT_MAX,
  CONTEXT_ELEMENT_MAX,
} from '../../src/limits/clamp-elements.js';
import type { SurfaceKind } from '../../src/index.js';

/**
 * Validate a rendered block list against Slack's hard limits — the same caps the
 * renderers clamp to. Slack rejects the WHOLE message if any single field
 * overflows, so the conformance suite asserts this returns no violations.
 * Reuses the production limit constants so the checker never drifts from the
 * clampers (the divergence item 10 guards against).
 */
export function validateLimits(
  blocks: readonly KnownBlock[],
  surfaceKind: SurfaceKind,
): readonly string[] {
  const violations: string[] = [];
  const blockMax = surfaceKind === 'message' ? MESSAGE_BLOCK_MAX : VIEW_BLOCK_MAX;
  over(violations, 'message', 'block count', blocks.length, blockMax);
  blocks.forEach((block, index) => {
    checkBlock(block, index, violations);
  });
  return violations;
}

function checkBlock(block: KnownBlock, index: number, out: string[]): void {
  const at = `block[${String(index)}] ${block.type}`;
  if (block.type === 'header') {
    over(out, at, 'header.text', block.text.text.length, HEADER_TEXT_MAX);
  }
  if (block.type === 'section') checkSection(block, at, out);
  if (block.type === 'context') {
    over(out, at, 'context.elements', block.elements.length, CONTEXT_ELEMENT_MAX);
  }
  if (block.type === 'actions') {
    over(out, at, 'actions.elements', block.elements.length, ACTIONS_ELEMENT_MAX);
    block.elements.forEach((element) => {
      checkOptioned(element, at, out);
    });
  }
  if (block.type === 'input') {
    over(out, at, 'input.label', block.label.text.length, INPUT_LABEL_MAX);
    checkOptioned(block.element, at, out);
  }
}

function checkSection(
  block: Extract<KnownBlock, { type: 'section' }>,
  at: string,
  out: string[],
): void {
  if (block.text) over(out, at, 'section.text', block.text.text.length, SECTION_TEXT_MAX);
  const fields = block.fields ?? [];
  over(out, at, 'section.fields', fields.length, SECTION_FIELD_MAX);
  fields.forEach((field) => {
    over(out, at, 'field.text', field.text.length, FIELD_TEXT_MAX);
  });
}

/** A static-option element (checkboxes / radio_buttons / static_select / multi). */
function checkOptioned(element: unknown, at: string, out: string[]): void {
  if (typeof element !== 'object' || element === null) return;
  const { type, options } = element as { type?: unknown; options?: unknown };
  if (!Array.isArray(options)) return;
  const kind = typeof type === 'string' ? type : 'element';
  over(out, at, `${kind}.options`, options.length, SELECT_OPTION_MAX);
  options.forEach((option: unknown) => {
    const text = (option as { text?: { text?: unknown } }).text?.text;
    if (typeof text === 'string') {
      over(out, at, 'option.text', text.length, OPTION_TEXT_MAX);
    }
  });
}

function over(
  out: string[],
  at: string,
  what: string,
  length: number,
  max: number,
): void {
  if (length > max) {
    out.push(`${at}: ${what} ${String(length)} > ${String(max)}`);
  }
}
