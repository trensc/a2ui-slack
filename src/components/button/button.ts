import type { ActionsBlock, Button, ContextBlock, KnownBlock } from '@slack/types';
import { clip } from '../../limits/clip.js';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderContext,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { formatLabel } from './internal/label.js';

/** Slack's hard limit on `button.url`. */
const BUTTON_URL_MAX = 3000;

/** Shown beneath a button A2UI wanted disabled (Block Kit has no disabled state). */
const DISABLED_NOTE = '⚠️ complete required fields';

/**
 * Render an A2UI Button as an `actions` block with a single `button`.
 *
 * - `hasServerAction` → encode an `action_id` (surfaceId injected by ctx).
 * - `url` → `button.url` (clipped to 3000); may coexist with an `action_id`.
 * - `variant 'primary'` → `style: 'primary'`; `'borderless'` has no equivalent.
 * - `disabled` → still render the button + a context note (Block Kit can't
 *   disable buttons), always reporting partial.
 *
 * Every fidelity loss (empty label, borderless, disabled) emits a report.
 */
export const renderButton: ComponentRenderer<'Button'> = (node, context) => {
  const degradations: DegradationReport[] = [];
  const button = buildButton(node, context, degradations);
  const actions: ActionsBlock = { type: 'actions', elements: [button] };
  const blocks: KnownBlock[] = [actions];
  if (node.disabled) {
    blocks.push(disabledNote());
    degradations.push(
      report(node, 'button rendered but disabled state cannot be applied'),
    );
  }
  return { blocks, degradations };
};

/** Assemble the Slack button element, pushing any fidelity-loss reports. */
function buildButton(
  node: ResolvedOf<'Button'>,
  context: RenderContext,
  degradations: DegradationReport[],
): Button {
  const label = formatLabel(node.label);
  if (label.isPlaceholder) {
    degradations.push(report(node, 'empty label substituted with a placeholder'));
  }
  const button: Button = {
    type: 'button',
    text: { type: 'plain_text', text: label.text },
  };
  return withStyle(node, withUrl(node, withAction(node, context, button)), degradations);
}

/** Attach an encoded `action_id` when the button fires a server action. */
function withAction(
  node: ResolvedOf<'Button'>,
  context: RenderContext,
  button: Button,
): Button {
  if (!node.hasServerAction) return button;
  return {
    ...button,
    action_id: context.encodeActionId({ kind: 'action', componentId: node.id }),
  };
}

/** Attach a clipped `url` when the button opens a link. */
function withUrl(node: ResolvedOf<'Button'>, button: Button): Button {
  if (node.url === undefined) return button;
  return { ...button, url: clip(node.url, BUTTON_URL_MAX) };
}

/** Map the A2UI variant to a Block Kit style, reporting the borderless gap. */
function withStyle(
  node: ResolvedOf<'Button'>,
  button: Button,
  degradations: DegradationReport[],
): Button {
  if (node.variant === 'primary') {
    return { ...button, style: 'primary' };
  }
  if (node.variant === 'borderless') {
    degradations.push(report(node, "variant 'borderless' has no Block Kit equivalent"));
    return button;
  }
  return button;
}

/** The context block standing in for a button A2UI wanted disabled. */
function disabledNote(): ContextBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text: DISABLED_NOTE }] };
}

/** A `partial` degradation for this button with the given reason. */
function report(node: ResolvedOf<'Button'>, reason: string): DegradationReport {
  return { componentId: node.id, componentType: node.type, fidelity: 'partial', reason };
}
