import type {
  ActionsBlock,
  InputBlock,
  NumberInput,
  PlainTextOption,
  StaticSelect,
} from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderContext,
  RenderResult,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';

const MAX_OPTIONS = 100;

/**
 * Slider → Block Kit has no slider. A range that fits in ≤100 integer steps maps
 * to a `static_select` of those values (initial = nearest step); a larger range
 * falls back to a `number_input`. Either way a `partial` report is emitted. In a
 * message the select lives in an `actions` block (fires `block_actions` on
 * change); in a view it lives in an `input` block. The number input is only valid
 * in an `input` block, dispatching on Enter when the surface is a message.
 */
export const renderSlider: ComponentRenderer<'Slider'> = (node, context) => {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const steps = node.max - node.min + 1;
  return steps <= MAX_OPTIONS
    ? steppedSelect(node, actionId, context)
    : numberFallback(node, actionId, context);
};

function snap(node: ResolvedOf<'Slider'>): number {
  const rounded = Math.round(node.value);
  return Math.min(node.max, Math.max(node.min, rounded));
}

function steppedSelect(
  node: ResolvedOf<'Slider'>,
  actionId: string,
  context: RenderContext,
): RenderResult {
  const initialValue = snap(node);
  const options: PlainTextOption[] = [];
  for (let value = node.min; value <= node.max; value += 1) {
    options.push({
      text: { type: 'plain_text', text: String(value) },
      value: String(value),
    });
  }
  const select: StaticSelect = {
    type: 'static_select',
    action_id: actionId,
    options,
    initial_option: {
      text: { type: 'plain_text', text: String(initialValue) },
      value: String(initialValue),
    },
  };
  const block =
    context.surfaceKind === 'message'
      ? actionsBlock(actionId, select)
      : selectInputBlock(actionId, node, select);
  return { blocks: [block], degradations: [steppedReport(node)] };
}

function actionsBlock(actionId: string, select: StaticSelect): ActionsBlock {
  return { type: 'actions', block_id: actionId, elements: [select] };
}

function selectInputBlock(
  actionId: string,
  node: ResolvedOf<'Slider'>,
  select: StaticSelect,
): InputBlock {
  return {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: rangeLabel(node) },
    optional: true,
    element: select,
  };
}

function rangeLabel(node: ResolvedOf<'Slider'>): string {
  return `Value (${String(node.min)}–${String(node.max)})`;
}

function numberFallback(
  node: ResolvedOf<'Slider'>,
  actionId: string,
  context: RenderContext,
): RenderResult {
  const element: NumberInput = {
    type: 'number_input',
    action_id: actionId,
    is_decimal_allowed: false,
    initial_value: String(snap(node)),
    min_value: String(node.min),
    max_value: String(node.max),
    ...(context.surfaceKind === 'message'
      ? { dispatch_action_config: { trigger_actions_on: ['on_enter_pressed'] } }
      : {}),
  };
  const block: InputBlock = {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: rangeLabel(node) },
    element,
    ...(context.surfaceKind === 'message' ? { dispatch_action: true } : {}),
  };
  return { blocks: [block], degradations: [numberReport(node)] };
}

function steppedReport(node: ResolvedOf<'Slider'>): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'no Block Kit slider; rendered as a stepped select',
  };
}

function numberReport(node: ResolvedOf<'Slider'>): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'slider range exceeds 100 steps; rendered as a number input',
  };
}
