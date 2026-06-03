import type { KnownBlock, TextObject } from '@slack/types';
import type {
  ComponentRenderer,
  DegradationReport,
  RenderResult,
} from '../render-context.js';
import { concatChildren } from '../layout-children/concat-children.js';
import { clip } from '../../limits/clip.js';
import { clipFieldText, collapsibleFieldOf } from './internal/two-up-field.js';

/**
 * Row → Block Kit. Block Kit has no true horizontal axis. When a row is exactly
 * two simple key/value text cells, they collapse to one `section.fields` (2-up,
 * the closest horizontal affordance) with no fidelity loss. Otherwise the row
 * flattens to a vertical stack of its children's blocks plus a `partial` report.
 */
export const renderRow: ComponentRenderer<'Row'> = (node, context) => {
  const [firstId, secondId, ...rest] = node.childrenIds;
  if (firstId !== undefined && secondId !== undefined && rest.length === 0) {
    const collapsed = collapseTwoUp(firstId, secondId, context);
    if (collapsed !== undefined) return collapsed;
  }
  return flattenVertical(node, context);
};

function collapseTwoUp(
  firstId: string,
  secondId: string,
  context: { renderChild: (id: string) => RenderResult },
): RenderResult | undefined {
  const first = context.renderChild(firstId);
  const second = context.renderChild(secondId);
  const firstField = collapsibleFieldOf(first);
  const secondField = collapsibleFieldOf(second);
  if (firstField === undefined || secondField === undefined) return undefined;
  const fields: TextObject[] = [
    clipFieldText(firstField, clip),
    clipFieldText(secondField, clip),
  ];
  const block: KnownBlock = { type: 'section', fields };
  return {
    blocks: [block],
    degradations: [...first.degradations, ...second.degradations],
  };
}

function flattenVertical(
  node: {
    readonly id: string;
    readonly type: 'Row';
    readonly childrenIds: readonly string[];
  },
  context: Parameters<ComponentRenderer<'Row'>>[1],
): RenderResult {
  const children = concatChildren(node.childrenIds, context);
  const report: DegradationReport = {
    componentId: node.id,
    componentType: node.type,
    fidelity: 'partial',
    reason: 'row flattened to vertical',
  };
  return {
    blocks: children.blocks,
    degradations: [report, ...children.degradations],
  };
}
