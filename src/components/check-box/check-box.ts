import type { ActionsBlock, Checkboxes, InputBlock } from '@slack/types';
import type { ComponentRenderer, RenderResult } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { clip } from '../../limits/clip.js';

const OPTION_TEXT_MAX = 150;

/**
 * CheckBox → a Block Kit `checkboxes` element with a single option. In a message
 * it lives in an `actions` block and fires `block_actions` directly on toggle; in
 * a view it sits in an `input` block and its state returns at `view_submission`.
 * `checked` becomes `initial_options`.
 */
export const renderCheckBox: ComponentRenderer<'CheckBox'> = (node, context) => {
  const actionId = context.encodeActionId({
    kind: 'input',
    componentId: node.id,
    path: node.path,
  });
  const element = checkbox(node, actionId);
  return context.surfaceKind === 'message'
    ? asActions(actionId, element)
    : asInput(node, actionId, element);
};

function checkbox(node: ResolvedOf<'CheckBox'>, actionId: string): Checkboxes {
  const option = {
    text: { type: 'plain_text', text: clip(node.label, OPTION_TEXT_MAX) },
    value: 'true',
  } as const;
  return {
    type: 'checkboxes',
    action_id: actionId,
    options: [option],
    ...(node.checked ? { initial_options: [option] } : {}),
  };
}

function asActions(actionId: string, element: Checkboxes): RenderResult {
  const block: ActionsBlock = {
    type: 'actions',
    block_id: actionId,
    elements: [element],
  };
  return { blocks: [block], degradations: [] };
}

function asInput(
  node: ResolvedOf<'CheckBox'>,
  actionId: string,
  element: Checkboxes,
): RenderResult {
  const block: InputBlock = {
    type: 'input',
    block_id: actionId,
    label: { type: 'plain_text', text: clip(node.label, OPTION_TEXT_MAX) },
    optional: true,
    element,
  };
  return { blocks: [block], degradations: [] };
}
