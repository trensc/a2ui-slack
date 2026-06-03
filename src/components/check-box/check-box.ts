import type { ActionsBlock, Checkboxes, InputBlock } from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderResult,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { clip } from '../../limits/clip.js';

/** Slack caps option text at 150 and an input block's label at 2000. */
const OPTION_TEXT_MAX = 150;
const LABEL_MAX = 2000;
/** Shown when the label resolves to empty (Slack rejects empty plain_text). */
const EMPTY_LABEL_PLACEHOLDER = 'Checkbox';

/**
 * CheckBox → a Block Kit `checkboxes` element with a single option. In a message
 * it lives in an `actions` block and fires `block_actions` directly on toggle; in
 * a view it sits in an `input` block and its state returns at `view_submission`.
 * `checked` becomes `initial_options`. An empty label is substituted (Slack
 * rejects empty text) and reported `partial`.
 */
export const renderCheckBox: ComponentRenderer<'CheckBox'> = (node, context) => {
  const wasEmpty = node.label.length === 0;
  const labelText = wasEmpty ? EMPTY_LABEL_PLACEHOLDER : node.label;
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const element = checkbox(node, labelText, actionId);
  const degradations = wasEmpty ? [emptyLabel(node)] : [];
  return context.surfaceKind === 'message'
    ? asActions(actionId, element, degradations)
    : asInput(labelText, actionId, element, degradations);
};

function checkbox(
  node: ResolvedOf<'CheckBox'>,
  labelText: string,
  actionId: string,
): Checkboxes {
  const option = {
    text: { type: 'plain_text', text: clip(labelText, OPTION_TEXT_MAX) },
    value: 'true',
  } as const;
  return {
    type: 'checkboxes',
    action_id: actionId,
    options: [option],
    ...(node.checked ? { initial_options: [option] } : {}),
  };
}

function asActions(
  actionId: string,
  element: Checkboxes,
  degradations: readonly DegradationReport[],
): RenderResult {
  const block: ActionsBlock = {
    type: 'actions',
    block_id: actionId,
    elements: [element],
  };
  return { blocks: [block], degradations };
}

function asInput(
  labelText: string,
  actionId: string,
  element: Checkboxes,
  degradations: readonly DegradationReport[],
): RenderResult {
  const block: InputBlock = {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: clip(labelText, LABEL_MAX) },
    optional: true,
    element,
  };
  return { blocks: [block], degradations };
}

function emptyLabel(node: ResolvedOf<'CheckBox'>): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'empty checkbox label substituted with placeholder',
  };
}
