import type { ComponentRenderer } from '../render-context.js';
import { concatChildren } from '../layout-children/concat-children.js';

/**
 * List → Block Kit. `List` templates are expanded upstream (the surface binder),
 * so a renderer only ever sees a flat, resolved id list. Rendering is therefore
 * just concatenating the child block runs in order, merging degradations upward.
 * The list itself loses no fidelity, so it adds no report. (The 50-block cap is a
 * global concern applied by the surface assembler — renderers stay unaware.)
 */
export const renderList: ComponentRenderer<'List'> = (node, context) =>
  concatChildren(node.childrenIds, context);
