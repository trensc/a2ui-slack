import type { InputBlock, PlainTextInput, SectionBlock } from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderContext,
  RenderResult,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { clip } from '../../limits/clip.js';

/** Slack caps an input block's label at 2000 chars. */
const LABEL_MAX = 2000;
/** Shown when the label resolves to empty (Slack rejects empty plain_text). */
const EMPTY_LABEL_PLACEHOLDER = 'Field';

/**
 * TextField → an `input` block wrapping a `plain_text_input`. In a message the
 * input dispatches a `block_actions` payload on Enter (two-way write-back); in a
 * view the value returns at `view_submission`. A `disabled` field has no Block
 * Kit equivalent, so it degrades to a read-only `section` + a `partial` report.
 * An empty label is substituted (Slack rejects empty text) and reported.
 */
export const renderTextField: ComponentRenderer<'TextField'> = (node, context) =>
  node.disabled ? renderReadOnly(node) : renderEditable(node, context);

/** Resolve the label, substituting a placeholder when empty (Slack rejects it). */
function resolveLabel(label: string): {
  readonly text: string;
  readonly wasEmpty: boolean;
} {
  return label.length === 0
    ? { text: EMPTY_LABEL_PLACEHOLDER, wasEmpty: true }
    : { text: label, wasEmpty: false };
}

function emptyLabel(node: ResolvedOf<'TextField'>): DegradationReport {
  return {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'empty text field label substituted with placeholder',
  };
}

function renderEditable(
  node: ResolvedOf<'TextField'>,
  context: RenderContext,
): RenderResult {
  const label = resolveLabel(node.label);
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const block: InputBlock = {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: clip(label.text, LABEL_MAX) },
    element: textInput(node, actionId, context.surfaceKind === 'message'),
    ...(context.surfaceKind === 'message' ? { dispatch_action: true } : {}),
  };
  return { blocks: [block], degradations: label.wasEmpty ? [emptyLabel(node)] : [] };
}

function textInput(
  node: ResolvedOf<'TextField'>,
  actionId: string,
  dispatching: boolean,
): PlainTextInput {
  return {
    type: 'plain_text_input',
    action_id: actionId,
    ...(node.value !== '' ? { initial_value: node.value } : {}),
    ...(node.multiline ? { multiline: true } : {}),
    ...(dispatching
      ? { dispatch_action_config: { trigger_actions_on: ['on_enter_pressed'] } }
      : {}),
  };
}

function renderReadOnly(node: ResolvedOf<'TextField'>): RenderResult {
  const label = resolveLabel(node.label);
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${clip(label.text, LABEL_MAX)}*\n${node.value === '' ? '_empty_' : node.value}`,
    },
  };
  return {
    blocks: [block],
    degradations: [
      {
        componentId: node.id,
        componentType: node.type,
        fidelity: 'partial',
        reason: 'disabled field has no Block Kit input; rendered read-only',
      },
      ...(label.wasEmpty ? [emptyLabel(node)] : []),
    ],
  };
}
