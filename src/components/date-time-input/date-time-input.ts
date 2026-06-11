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
      ? [actionsBlock(first.picker, rest.map(toPicker))]
      : [first, ...rest].map((result) => inputBlock(result.picker));
  const malformed = [first, ...rest]
    .map((result) => result.report)
    .filter((report) => report !== undefined);
  const split = node.mode === 'datetime' ? [splitReport(node)] : [];
  return { blocks, degradations: [...split, ...malformed] };
};

interface PickerResult {
  readonly picker: Picker;
  readonly report: DegradationReport | undefined;
}

function toPicker(result: PickerResult): Picker {
  return result.picker;
}

function pickers(
  node: ResolvedOf<'DateTimeInput'>,
  context: RenderContext,
): readonly [PickerResult, ...PickerResult[]] {
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

function datePicker(
  node: ResolvedOf<'DateTimeInput'>,
  context: RenderContext,
): PickerResult {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const candidate = datePart(node.value);
  const initial = candidate === undefined ? undefined : normalizeDate(candidate);
  const element: Datepicker = {
    type: 'datepicker',
    action_id: actionId,
    ...(initial !== undefined ? { initial_date: initial } : {}),
  };
  return {
    picker: { actionId, element },
    report: malformedReport(node, candidate, initial, 'date (expected YYYY-MM-DD)'),
  };
}

function timePicker(
  node: ResolvedOf<'DateTimeInput'>,
  context: RenderContext,
): PickerResult {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: `${node.id}#time`,
    path: node.path,
  });
  const candidate = timePart(node.value, node.mode);
  const initial = candidate === undefined ? undefined : normalizeTime(candidate);
  const element: Timepicker = {
    type: 'timepicker',
    action_id: actionId,
    ...(initial !== undefined ? { initial_time: initial } : {}),
  };
  return {
    picker: { actionId, element },
    report: malformedReport(node, candidate, initial, 'time (expected HH:mm)'),
  };
}

function datePart(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const separator = value.indexOf('T');
  const candidate = separator === -1 ? value : value.slice(0, separator);
  return candidate === '' ? undefined : candidate;
}

/** In `datetime` mode the time lives after the `T`; a value without one is date-only. */
function timePart(
  value: string | undefined,
  mode: ResolvedOf<'DateTimeInput'>['mode'],
): string | undefined {
  if (value === undefined) return undefined;
  const separator = value.indexOf('T');
  if (separator === -1) return mode === 'datetime' ? undefined : value;
  const candidate = value.slice(separator + 1);
  return candidate === '' ? undefined : candidate;
}

/** Slack rejects out-of-shape initials, so a candidate must parse or be dropped. */
function normalizeDate(candidate: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return undefined;
  return Number.isNaN(Date.parse(candidate)) ? undefined : candidate;
}

function normalizeTime(candidate: string): string | undefined {
  const shape = /^\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
  if (!shape.test(candidate)) return undefined;
  const separator = candidate.indexOf(':');
  const hours = candidate.slice(0, separator);
  const minutes = candidate.slice(separator + 1, separator + 3);
  if (Number(hours) > 23 || Number(minutes) > 59) return undefined;
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function malformedReport(
  node: ResolvedOf<'DateTimeInput'>,
  candidate: string | undefined,
  initial: string | undefined,
  expected: string,
): DegradationReport | undefined {
  if (candidate === undefined || initial !== undefined) return undefined;
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: `ignored malformed initial ${expected}: "${candidate}"`,
  };
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
