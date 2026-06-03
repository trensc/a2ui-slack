import type { ComponentRenderer } from '../render-context.js';
import { concatChildren } from '../layout-children/concat-children.js';

/**
 * Column → Block Kit. The natural container: Block Kit stacks blocks vertically,
 * so a column is just its children rendered in order and concatenated. Child
 * blocks flatten into one run and child degradations merge upward; the column
 * itself loses no fidelity, so it adds no report.
 */
export const renderColumn: ComponentRenderer<'Column'> = (node, context) =>
  concatChildren(node.childrenIds, context);
