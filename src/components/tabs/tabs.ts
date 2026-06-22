import type { KnownBlock } from '@slack/types';
import { actionRef } from '../../action-id/action-id-ref.js';
import type { ComponentRenderer, DegradationReport } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { buildSwitchControl, type ResolvedTab } from './internal/tab-switch.js';

/**
 * Tabs → Block Kit. Block Kit has no tab strip, so only the active tab's child is
 * rendered, prefixed by a switch control (buttons, or an overflow menu when there
 * are >5 tabs) whose `action_id` carries a tab-switch action — picking a tab is an
 * interaction that triggers a re-render. `activeIndex` is clamped into range (with
 * a report when it was out of bounds); an empty tab set renders only the report.
 * Always `partial`: tabs are emulated, never native.
 */
export const renderTabs: ComponentRenderer<'Tabs'> = (node, context) => {
  const emulated: DegradationReport = report(
    node.id,
    'tabs emulated via switch + re-render',
  );
  const active = activeTab(node);
  if (active === undefined) {
    return { blocks: [], degradations: [emulated] };
  }
  const switchControl = buildSwitchControl(
    node.tabs,
    active.index,
    context.encodeActionId(actionRef(node.id)),
    node.id,
  );
  const child = context.renderChild(active.tab.childId);
  const blocks: KnownBlock[] = [switchControl.block, ...child.blocks];
  return {
    blocks,
    degradations: [
      emulated,
      ...active.clampReport,
      ...switchControl.degradations,
      ...child.degradations,
    ],
  };
};

interface ActiveTab {
  readonly index: number;
  readonly tab: ResolvedTab;
  readonly clampReport: readonly DegradationReport[];
}

/** Resolve the in-range active tab, clamping a bad `activeIndex` and reporting it. */
function activeTab(node: ResolvedOf<'Tabs'>): ActiveTab | undefined {
  const [first, ...rest] = node.tabs;
  if (first === undefined) return undefined;
  const lastIndex = rest.length;
  const inRange = node.activeIndex >= 0 && node.activeIndex <= lastIndex;
  const index = inRange ? node.activeIndex : node.activeIndex < 0 ? 0 : lastIndex;
  // index ∈ [0, lastIndex]; `[first, ...rest]` indexes the same as `node.tabs`,
  // so this fold returns the element at `index` with no possibly-undefined access.
  const tab = [first, ...rest].reduce(
    (found, candidate, at) => (at === index ? candidate : found),
    first,
  );
  const clampReport = inRange
    ? []
    : [report(node.id, 'activeIndex out of range, clamped')];
  return { index, tab, clampReport };
}

function report(componentId: string, reason: string): DegradationReport {
  return { componentId, componentType: 'Tabs', fidelity: 'partial', reason };
}
