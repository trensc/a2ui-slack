import type { InputBlock, PlainTextInput, SectionBlock } from '@slack/types';
import type {
  ComponentRenderer,
  RenderContext,
  RenderResult,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { clip } from '../../limits/clip.js';

const LABEL_MAX = 150;

/**
 * TextField → an `input` block wrapping a `plain_text_input`. In a message the
 * input dispatches a `block_actions` payload on Enter (two-way write-back); in a
 * view the value returns at `view_submission`. A `disabled` field has no Block
 * Kit equivalent, so it degrades to a read-only `section` + a `partial` report.
 */
export const renderTextField: ComponentRenderer<'TextField'> = (node, context) =>
  node.disabled ? renderReadOnly(node) : renderEditable(node, context);

function renderEditable(
  node: ResolvedOf<'TextField'>,
  context: RenderContext,
): RenderResult {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const block: InputBlock = {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: clip(node.label, LABEL_MAX) },
    element: textInput(node, actionId, context.surfaceKind === 'message'),
    ...(context.surfaceKind === 'message' ? { dispatch_action: true } : {}),
  };
  return { blocks: [block], degradations: [] };
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
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${clip(node.label, LABEL_MAX)}*\n${node.value === '' ? '_empty_' : node.value}`,
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
    ],
  };
}
