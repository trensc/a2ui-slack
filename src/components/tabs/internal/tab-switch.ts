import type { ActionsBlock, Button, Overflow, PlainTextOption } from '@slack/types';
import type { DegradationReport } from '../../render-context.js';
import { clip } from '../../../limits/clip.js';
import { BUTTON_TEXT_MAX } from '../../../limits/clamp-text.js';

/** Slack caps overflow menus at 5 options. */
const OVERFLOW_OPTION_MAX = 5;
/** Keep the button row to a usable size; Slack allows 25 but UX wants few. */
const BUTTON_TABS_MAX = 5;

export interface ResolvedTab {
  readonly title: string;
  readonly childId: string;
}

export interface SwitchControl {
  readonly block: ActionsBlock;
  readonly degradations: readonly DegradationReport[];
}

/**
 * Build the tab-switch control: a row of `button`s when there are ≤5 tabs, or a
 * single `overflow` menu when there are more (Slack has no horizontal tab strip,
 * so switching emulates via an interaction → re-render). Each control element
 * encodes the same `action_id`; the picked tab index travels in the element/option
 * `value`. Returns the block plus any degradations (e.g. overflow's 5-option cap).
 */
export function buildSwitchControl(
  tabs: readonly ResolvedTab[],
  activeIndex: number,
  actionId: string,
  componentId: string,
): SwitchControl {
  if (tabs.length > BUTTON_TABS_MAX) {
    return overflowControl(tabs, actionId, componentId);
  }
  return { block: buttonRow(tabs, activeIndex, actionId), degradations: [] };
}

function buttonRow(
  tabs: readonly ResolvedTab[],
  activeIndex: number,
  actionId: string,
): ActionsBlock {
  const elements: Button[] = tabs.map((tab, index) => ({
    type: 'button',
    text: { type: 'plain_text', text: clip(tab.title, BUTTON_TEXT_MAX) },
    value: String(index),
    action_id: `${actionId}#${String(index)}`,
    ...(index === activeIndex ? { style: 'primary' as const } : {}),
  }));
  return { type: 'actions', elements };
}

function overflowControl(
  tabs: readonly ResolvedTab[],
  actionId: string,
  componentId: string,
): SwitchControl {
  const options: PlainTextOption[] = tabs
    .slice(0, OVERFLOW_OPTION_MAX)
    .map((tab, index) => ({
      text: { type: 'plain_text', text: clip(tab.title, BUTTON_TEXT_MAX) },
      value: String(index),
    }));
  const overflow: Overflow = { type: 'overflow', options, action_id: actionId };
  // Reached only when there are >5 tabs (the button-row threshold), and an
  // overflow menu holds at most 5 options — so some tab switches are unreachable.
  const degradations: DegradationReport[] = [
    {
      componentId,
      componentType: 'Tabs',
      fidelity: 'partial',
      reason: 'overflow switch limited to 5 tabs',
    },
  ];
  return { block: { type: 'actions', elements: [overflow] }, degradations };
}
