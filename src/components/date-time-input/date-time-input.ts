import type { ActionsBlock, Datepicker, InputBlock, Timepicker } from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderContext,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';

interface Picker {
  readonly actionId: string;
  readonly element: Datepicker | Timepicker;
}

/**
 * DateTimeInput → a `datepicker` and/or `timepicker`. `date` and `time` modes are
 * single widgets (full fidelity). `datetime` has no combined Block Kit widget, so
 * it splits into two pickers and emits a `partial` report. In a message the
 * widgets live in an `actions` block; in a view, in `input` blocks (one each).
 */
export const renderDateTimeInput: ComponentRenderer<'DateTimeInput'> = (
  node,
  context,
) => {
  const [first, ...rest] = pickers(node, context);
  const blocks =
    context.surfaceKind === 'message'
      ? [actionsBlock(first, rest)]
      : [first, ...rest].map(inputBlock);
  return { blocks, degradations: node.mode === 'datetime' ? [splitReport(node)] : [] };
};

function pickers(
  node: ResolvedOf<'DateTimeInput'>,
  context: RenderContext,
): readonly [Picker, ...Picker[]] {
  switch (node.mode) {
    case 'date':
      return [datePicker(node, context)];
    case 'time':
      return [timePicker(node, context)];
    case 'datetime':
      return [datePicker(node, context), timePicker(node, context)];
    /* v8 ignore start -- unreachable: the never assignment makes a missing case a compile error. */
    default: {
      const exhaustive: never = node.mode;
      return exhaustive;
    }
    /* v8 ignore stop */
  }
}

function datePicker(node: ResolvedOf<'DateTimeInput'>, context: RenderContext): Picker {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const initial = datePart(node.value);
  const element: Datepicker = {
    type: 'datepicker',
    action_id: actionId,
    ...(initial !== undefined ? { initial_date: initial } : {}),
  };
  return { actionId, element };
}

function timePicker(node: ResolvedOf<'DateTimeInput'>, context: RenderContext): Picker {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: `${node.id}#time`,
    path: node.path,
  });
  const initial = timePart(node.value);
  const element: Timepicker = {
    type: 'timepicker',
    action_id: actionId,
    ...(initial !== undefined ? { initial_time: initial } : {}),
  };
  return { actionId, element };
}

function datePart(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const separator = value.indexOf('T');
  const beforeTime = separator === -1 ? value : value.slice(0, separator);
  return beforeTime.includes('-') ? beforeTime : undefined;
}

function timePart(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const separator = value.indexOf('T');
  const candidate = separator === -1 ? value : value.slice(separator + 1);
  return candidate.includes(':') ? candidate : undefined;
}

function actionsBlock(first: Picker, rest: readonly Picker[]): ActionsBlock {
  return {
    type: 'actions',
    block_id: first.actionId,
    elements: [first, ...rest].map((picker) => picker.element),
  };
}

function inputBlock(picker: Picker): InputBlock {
  return {
    type: 'input',
    block_id: picker.actionId,
    label: {
      type: 'plain_text',
      text: picker.element.type === 'datepicker' ? 'Date' : 'Time',
    },
    optional: true,
    element: picker.element,
  };
}

function splitReport(node: ResolvedOf<'DateTimeInput'>): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'no combined date+time widget; split into separate pickers',
  };
}
