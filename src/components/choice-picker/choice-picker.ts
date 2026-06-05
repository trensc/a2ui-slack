import type {
  ActionsBlock,
  Checkboxes,
  InputBlock,
  MultiStaticSelect,
  PlainTextOption,
  RadioButtons,
  StaticSelect,
} from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderResult,
} from '../render-context.js';
import type { ChoiceOption, ResolvedOf } from '../resolved-component.js';
import { clip } from '../../limits/clip.js';
import {
  OPTION_TEXT_MAX,
  RADIO_OPTION_MAX,
  SELECT_OPTION_MAX,
} from '../../limits/clamp-options.js';

type SelectElement = RadioButtons | StaticSelect | Checkboxes | MultiStaticSelect;

/** A `PlainTextOption` whose `value` is always present (the A2UI option value). */
type ValuedOption = PlainTextOption & { readonly value: string };

/**
 * ChoicePicker → a Block Kit selection element. Single-select uses
 * `radio_buttons` (≤10) or `static_select`; multi-select uses `checkboxes` (≤10)
 * or `multi_static_select`. Option count is clamped to 100 (partial report on
 * overflow); an empty option list drops with a report. In a message the element
 * lives in an `actions` block (fires `block_actions`); in a view, an `input` block.
 */
export const renderChoicePicker: ComponentRenderer<'ChoicePicker'> = (node, context) => {
  if (node.options.length === 0) return emptyResult(node);
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const kept = node.options.slice(0, SELECT_OPTION_MAX);
  const options = kept.map(toOption);
  const element = buildElement(node, actionId, kept.length, options);
  const block =
    context.surfaceKind === 'message'
      ? actionsBlock(actionId, element)
      : inputBlock(node, actionId, element);
  return { blocks: [block], degradations: overflowReports(node) };
};

function toOption(option: ChoiceOption): ValuedOption {
  return {
    text: { type: 'plain_text', text: clip(option.label, OPTION_TEXT_MAX) },
    value: option.value,
  };
}

function buildElement(
  node: ResolvedOf<'ChoicePicker'>,
  actionId: string,
  count: number,
  options: readonly ValuedOption[],
): SelectElement {
  const selectedSet = new Set(node.selected);
  const chosen = options.filter((option) => selectedSet.has(option.value));
  if (node.multiple) {
    return count <= RADIO_OPTION_MAX
      ? checkboxes(actionId, options, chosen)
      : multiSelect(actionId, options, chosen);
  }
  return count <= RADIO_OPTION_MAX
    ? radioButtons(actionId, options, chosen[0])
    : staticSelect(actionId, options, chosen[0]);
}

function radioButtons(
  actionId: string,
  options: readonly PlainTextOption[],
  initial: PlainTextOption | undefined,
): RadioButtons {
  return {
    type: 'radio_buttons',
    action_id: actionId,
    options: [...options],
    ...(initial ? { initial_option: initial } : {}),
  };
}

function staticSelect(
  actionId: string,
  options: readonly PlainTextOption[],
  initial: PlainTextOption | undefined,
): StaticSelect {
  return {
    type: 'static_select',
    action_id: actionId,
    options: [...options],
    ...(initial ? { initial_option: initial } : {}),
  };
}

function checkboxes(
  actionId: string,
  options: readonly PlainTextOption[],
  chosen: readonly PlainTextOption[],
): Checkboxes {
  return {
    type: 'checkboxes',
    action_id: actionId,
    options: [...options],
    ...(chosen.length > 0 ? { initial_options: [...chosen] } : {}),
  };
}

function multiSelect(
  actionId: string,
  options: readonly PlainTextOption[],
  chosen: readonly PlainTextOption[],
): MultiStaticSelect {
  return {
    type: 'multi_static_select',
    action_id: actionId,
    options: [...options],
    ...(chosen.length > 0 ? { initial_options: [...chosen] } : {}),
  };
}

function actionsBlock(actionId: string, element: SelectElement): ActionsBlock {
  return { type: 'actions', block_id: actionId, elements: [element] };
}

function inputBlock(
  node: ResolvedOf<'ChoicePicker'>,
  actionId: string,
  element: SelectElement,
): InputBlock {
  return {
    type: 'input',
    block_id: actionId,
    label: {
      type: 'plain_text',
      text: node.multiple ? 'Select options' : 'Select an option',
    },
    optional: true,
    element,
  };
}

function overflowReports(node: ResolvedOf<'ChoicePicker'>): readonly DegradationReport[] {
  if (node.options.length <= SELECT_OPTION_MAX) return [];
  return [
    {
      componentId: node.id,
      componentType: node.type,
      fidelity: 'partial',
      reason: `clamped ${String(node.options.length)} options to 100`,
    },
  ];
}

function emptyResult(node: ResolvedOf<'ChoicePicker'>): RenderResult {
  return {
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '_no options_' } }],
    degradations: [
      {
        componentId: node.id,
        componentType: node.type,
        fidelity: 'dropped',
        reason: 'choice picker has no options',
      },
    ],
  };
}
