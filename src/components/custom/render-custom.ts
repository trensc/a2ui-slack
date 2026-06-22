import type { KnownBlock } from '@slack/types';
import { actionRef, inputRef } from '../../action-id/action-id-ref.js';
import type {
  DegradationReport,
  RenderContext,
  RenderResult,
} from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { fallbackResult } from '../fallback.js';
import type { CustomComponentContext, RegisteredComponent } from './custom-component.js';

/** Render a registered custom component, isolating integrator-code failures as degradations. */
export function renderCustom(
  node: ResolvedOf<'Custom'>,
  context: RenderContext,
): RenderResult {
  const registered = context.customComponents?.get(node.name);
  if (registered === undefined) {
    return fallbackResult(node, `custom component "${node.name}" is not registered`);
  }
  const degradations: DegradationReport[] = [];
  try {
    const blocks = registered.component.render(
      node.props,
      buildCustomContext(node, registered, context, degradations),
    );
    if (!isBlockArray(blocks)) {
      return fallbackResult(
        node,
        `render of "${node.name}" did not return Block Kit blocks`,
      );
    }
    return { blocks, degradations };
  } catch (error) {
    return fallbackResult(node, `render of "${node.name}" threw: ${String(error)}`);
  }
}

/**
 * Build the ctx passed to an integrator's render function.
 * `action` and `input` throw on an undeclared param name so a typo degrades,
 * never wires a dead or root-pointer action_id. An `input` whose resolved node
 * carries no write-back path records a `partial` degradation — the value the user
 * types cannot round-trip, and the renderer never fails silently.
 */
function buildCustomContext(
  node: ResolvedOf<'Custom'>,
  registered: RegisteredComponent,
  context: RenderContext,
  degradations: DegradationReport[],
): CustomComponentContext {
  const { component, actionNames, inputNames } = registered;
  return {
    id: node.id,
    surfaceKind: context.surfaceKind,
    action: (paramName) => {
      if (!actionNames.has(paramName)) {
        throw new Error(
          `ctx.action: "${paramName}" is not a declared action of "${component.name}"`,
        );
      }
      return context.encodeActionId(actionRef(node.id, node.actions[paramName]));
    },
    input: (paramName) => {
      if (!inputNames.has(paramName)) {
        throw new Error(
          `ctx.input: "${paramName}" is not a declared input of "${component.name}"`,
        );
      }
      const path = node.inputs[paramName] ?? '';
      if (path === '') {
        degradations.push({
          componentId: node.id,
          componentType: 'Custom',
          fidelity: 'partial',
          reason: `custom input "${paramName}" of "${component.name}" has no write-back binding; user input will not round-trip`,
        });
      }
      return context.encodeActionId(
        inputRef(node.id, path, { component: component.name, param: paramName }),
      );
    },
  };
}

/** Top-level Block Kit block types Slack accepts; an unknown `type` is rejected before post. */
const KNOWN_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'actions',
  'context',
  'divider',
  'file',
  'header',
  'image',
  'input',
  'rich_text',
  'section',
  'video',
]);

/** Every entry must be a recognised Block Kit block — a typo'd `type` degrades locally, not at post time. */
function isBlockArray(value: unknown): value is readonly KnownBlock[] {
  return Array.isArray(value) && value.every(isBlock);
}

/** One entry is block-shaped: a non-null object whose `type` is a known Block Kit block. */
function isBlock(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const type = (entry as { type?: unknown }).type;
  return typeof type === 'string' && KNOWN_BLOCK_TYPES.has(type);
}
