import type { ActionsBlock, Button, ContextBlock, KnownBlock } from '@slack/types';
import { actionRef } from '../../action-id/action-id-ref.js';
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
 * - `hasServerAction` → encode an `action_id` (surfaceId injected by context).
 * - `url` → `button.url` (clipped to 3000); may coexist with an `action_id`.
 * - `variant 'primary'` → `style: 'primary'`; `'borderless'` has no equivalent.
 * - `disabled` → still render the button + a context note (Block Kit can't
 *   disable buttons), always reporting partial.
 *
 * Every fidelity loss (empty label, borderless, disabled) emits a report.
 */
export const renderButton: ComponentRenderer<'Button'> = (node, context) => {
  const { button, reports } = buildButton(node, context);
  const actions: ActionsBlock = { type: 'actions', elements: [button] };
  const blocks: KnownBlock[] = [actions];
  const degradations: DegradationReport[] = [...reports];
  if (node.disabled) {
    blocks.push(disabledNote());
    degradations.push(
      report(node, 'button rendered but disabled state cannot be applied'),
    );
  }
  return { blocks, degradations };
};

/** Assemble the Slack button element plus any fidelity-loss reports (pure). */
function buildButton(
  node: ResolvedOf<'Button'>,
  context: RenderContext,
): { button: Button; reports: readonly DegradationReport[] } {
  const label = formatLabel(node.label);
  const labelReports = label.isPlaceholder
    ? [report(node, 'empty label substituted with a placeholder')]
    : [];
  const base: Button = {
    type: 'button',
    text: { type: 'plain_text', text: label.text },
  };
  const styled = withStyle(node, withUrl(node, withAction(node, context, base)));
  return { button: styled.button, reports: [...labelReports, ...styled.reports] };
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
    action_id: context.encodeActionId(actionRef(node.id)),
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
): { button: Button; reports: readonly DegradationReport[] } {
  if (node.variant === 'primary') {
    return { button: { ...button, style: 'primary' }, reports: [] };
  }
  if (node.variant === 'borderless') {
    return {
      button,
      reports: [report(node, "variant 'borderless' has no Block Kit equivalent")],
    };
  }
  return { button, reports: [] };
}

/** The context block standing in for a button A2UI wanted disabled. */
function disabledNote(): ContextBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text: DISABLED_NOTE }] };
}

/** A `partial` degradation for this button with the given reason. */
function report(node: ResolvedOf<'Button'>, reason: string): DegradationReport {
  return { componentId: node.id, componentType: node.type, fidelity: 'partial', reason };
}
