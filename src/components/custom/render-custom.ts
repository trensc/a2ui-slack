import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { fallbackResult } from '../fallback.js';
import type { CustomComponent, CustomComponentContext } from './custom-component.js';

/** Render a registered custom component, isolating integrator-code failures as degradations. */
export function renderCustom(
  node: ResolvedOf<'Custom'>,
  context: RenderContext,
): RenderResult {
  const component = context.customComponents?.get(node.name);
  if (component === undefined) {
    return fallbackResult(node, `custom component "${node.name}" is not registered`);
  }
  try {
    const blocks = component.render(
      node.props,
      buildCustomContext(node, component, context),
    );
    if (!isBlockArray(blocks)) {
      return fallbackResult(
        node,
        `render of "${node.name}" did not return Block Kit blocks`,
      );
    }
    return { blocks, degradations: [] };
  } catch (error) {
    return fallbackResult(node, `render of "${node.name}" threw: ${String(error)}`);
  }
}

/**
 * Build the ctx passed to an integrator's render function.
 * `action` and `input` throw on an undeclared param name so a typo degrades,
 * never wires a dead or root-pointer action_id.
 */
function buildCustomContext(
  node: ResolvedOf<'Custom'>,
  component: CustomComponent,
  context: RenderContext,
): CustomComponentContext {
  const declaredActions = new Set(component.actions ?? []);
  const declaredInputs = new Set(Object.keys(component.inputs ?? {}));
  return {
    id: node.id,
    surfaceKind: context.surfaceKind,
    action: (paramName) => {
      if (!declaredActions.has(paramName)) {
        throw new Error(
          `ctx.action: "${paramName}" is not a declared action of "${node.name}"`,
        );
      }
      // exactOptionalPropertyTypes + noUncheckedIndexedAccess: `node.actions[paramName]` is
      // `string | undefined`, which cannot be assigned to optional `action?: string`. Spread it
      // in only when present (same idiom as `toFireAction` / `resolveDateTimeInput`).
      const value = node.actions[paramName];
      const ref = { kind: 'action' as const, componentId: node.id };
      return context.encodeActionId(
        value === undefined ? ref : { ...ref, action: value },
      );
    },
    input: (paramName) => {
      if (!declaredInputs.has(paramName)) {
        throw new Error(
          `ctx.input: "${paramName}" is not a declared input of "${node.name}"`,
        );
      }
      return context.encodeActionId({
        kind: 'input',
        componentId: node.id,
        path: node.inputs[paramName] ?? '',
        custom: { component: node.name, param: paramName },
      });
    },
  };
}

/** A light structural guard — full Block Kit validity is checked by Slack at post time. */
function isBlockArray(value: unknown): value is readonly KnownBlock[] {
  return Array.isArray(value) && value.every(isBlock);
}

/** One entry is block-shaped: a non-null object with a string `type`. */
function isBlock(entry: unknown): boolean {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { type?: unknown }).type === 'string'
  );
}
