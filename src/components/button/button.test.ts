import { describe, expect, it } from 'vitest';
import type { ActionsBlock, Button, KnownBlock } from '@slack/types';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId as encodeWithRegistry,
} from '../../action-id/action-id.js';
import type { DegradationReport, RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderButton } from './button.js';
import { BUTTON_TEXT_MAX, PLACEHOLDER_LABEL } from './internal/label.js';

const SURFACE_ID = 'surface-1';
const URL_MAX = 3000;
const DISABLED_NOTE = '⚠️ complete required fields';

/**
 * A test context whose encodeActionId injects a fixed surfaceId (as the real
 * surface layer does) and delegates to the production codec, so we can decode.
 */
function makeContext(): {
  ctx: RenderContext;
  decode: (id: string) => ActionIdRef | undefined;
} {
  let registry = emptyRegistry;
  const ctx: RenderContext = {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => {
      const full: ActionIdRef = { ...ref, surfaceId: SURFACE_ID };
      const result = encodeWithRegistry(full, registry);
      registry = result.registry;
      return result.id;
    },
    surfaceKind: 'message',
  };
  const decode = (id: string): ActionIdRef | undefined => {
    const result = decodeActionId(id, registry);
    return result.ok ? result.ref : undefined;
  };
  return { ctx, decode };
}

function baseNode(overrides: Partial<ResolvedOf<'Button'>> = {}): ResolvedOf<'Button'> {
  return {
    type: 'Button',
    id: 'btn-1',
    label: 'Save',
    disabled: false,
    hasServerAction: false,
    ...overrides,
  };
}

function firstActions(blocks: readonly KnownBlock[]): ActionsBlock {
  const block = blocks[0];
  if (block === undefined || block.type !== 'actions') {
    throw new Error('expected an actions block first');
  }
  return block;
}

function soleButton(block: ActionsBlock): Button {
  expect(block.elements).toHaveLength(1);
  const element = block.elements[0];
  if (element === undefined || element.type !== 'button') {
    throw new Error('expected a button element');
  }
  return element;
}

/** The single degradation whose reason contains `needle`, else throws. */
function degradationFor(
  degradations: readonly DegradationReport[],
  needle: string,
): DegradationReport {
  const match = degradations.find((report) => report.reason.includes(needle));
  if (match === undefined) {
    throw new Error(`no degradation mentioning "${needle}"`);
  }
  return match;
}

describe('renderButton', () => {
  it('renders a plain button: actions block, plain_text label, no degradations', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(baseNode(), ctx);
    const button = soleButton(firstActions(blocks));
    expect(button).toEqual({
      type: 'button',
      text: { type: 'plain_text', text: 'Save' },
    });
    expect(degradations).toEqual([]);
  });

  it('keeps a label exactly at 75 chars untouched', () => {
    const { ctx } = makeContext();
    const atLimit = 'a'.repeat(BUTTON_TEXT_MAX);
    const button = soleButton(
      firstActions(renderButton(baseNode({ label: atLimit }), ctx).blocks),
    );
    expect(button.text.text).toBe(atLimit);
  });

  it('clips a label over 75 chars to 75', () => {
    const { ctx } = makeContext();
    const over = 'a'.repeat(BUTTON_TEXT_MAX + 10);
    const button = soleButton(
      firstActions(renderButton(baseNode({ label: over }), ctx).blocks),
    );
    expect(button.text.text.length).toBe(BUTTON_TEXT_MAX);
  });

  it('substitutes a placeholder for an empty label and reports partial', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(baseNode({ label: '' }), ctx);
    const button = soleButton(firstActions(blocks));
    expect(button.text.text).toBe(PLACEHOLDER_LABEL);
    const degradation = degradationFor(degradations, 'empty label');
    expect(degradation.componentId).toBe('btn-1');
    expect(degradation.componentType).toBe('Button');
    expect(degradation.fidelity).toBe('partial');
  });

  it('encodes an action_id for a server action and emits no degradation', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(
      baseNode({ hasServerAction: true }),
      ctx,
    );
    const button = soleButton(firstActions(blocks));
    expect(button.action_id).toBeDefined();
    expect(degradations).toEqual([]);
    expect(button.url).toBeUndefined();
  });

  it('round-trips the encoded action_id back to the original ref', () => {
    const { ctx, decode } = makeContext();
    const button = soleButton(
      firstActions(renderButton(baseNode({ hasServerAction: true }), ctx).blocks),
    );
    const actionId = button.action_id;
    if (actionId === undefined) throw new Error('expected an action_id');
    expect(decode(actionId)).toEqual({
      kind: 'action',
      surfaceId: SURFACE_ID,
      componentId: 'btn-1',
    });
  });

  it('sets button.url for a url button and adds no action_id without a server action', () => {
    const { ctx } = makeContext();
    const button = soleButton(
      firstActions(renderButton(baseNode({ url: 'https://example.com' }), ctx).blocks),
    );
    expect(button.url).toBe('https://example.com');
    expect(button.action_id).toBeUndefined();
  });

  it('clips a url over 3000 chars to the limit', () => {
    const { ctx } = makeContext();
    const longUrl = `https://e.com/${'a'.repeat(URL_MAX)}`;
    const button = soleButton(
      firstActions(renderButton(baseNode({ url: longUrl }), ctx).blocks),
    );
    expect(button.url?.length).toBe(URL_MAX);
  });

  it('keeps a url exactly at 3000 chars untouched', () => {
    const { ctx } = makeContext();
    const atLimit = `https://e.com/${'a'.repeat(URL_MAX - 14)}`;
    expect(atLimit.length).toBe(URL_MAX);
    const button = soleButton(
      firstActions(renderButton(baseNode({ url: atLimit }), ctx).blocks),
    );
    expect(button.url).toBe(atLimit);
  });

  it('carries BOTH url and action_id when a url button also has a server action', () => {
    const { ctx, decode } = makeContext();
    const button = soleButton(
      firstActions(
        renderButton(baseNode({ url: 'https://x.com', hasServerAction: true }), ctx)
          .blocks,
      ),
    );
    expect(button.url).toBe('https://x.com');
    const actionId = button.action_id;
    if (actionId === undefined) throw new Error('expected an action_id');
    expect(decode(actionId)).toEqual({
      kind: 'action',
      surfaceId: SURFACE_ID,
      componentId: 'btn-1',
    });
  });

  it('maps variant primary to style primary with no degradation', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(baseNode({ variant: 'primary' }), ctx);
    expect(soleButton(firstActions(blocks)).style).toBe('primary');
    expect(degradations).toEqual([]);
  });

  it('maps variant borderless to default style and reports partial', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(
      baseNode({ variant: 'borderless' }),
      ctx,
    );
    expect(soleButton(firstActions(blocks)).style).toBeUndefined();
    expect(degradationFor(degradations, 'borderless').fidelity).toBe('partial');
  });

  it('omits style when no variant is set', () => {
    const { ctx } = makeContext();
    const button = soleButton(firstActions(renderButton(baseNode(), ctx).blocks));
    expect(button.style).toBeUndefined();
  });

  it('appends a context note and reports partial for a disabled button', () => {
    const { ctx } = makeContext();
    const { blocks, degradations } = renderButton(baseNode({ disabled: true }), ctx);
    expect(blocks).toHaveLength(2);
    // The button is still rendered.
    soleButton(firstActions(blocks));
    const context = blocks[1];
    if (context === undefined || context.type !== 'context') {
      throw new Error('expected a context block second');
    }
    const note = context.elements[0];
    expect(note).toEqual({ type: 'mrkdwn', text: DISABLED_NOTE });
    expect(degradationFor(degradations, 'disabled').fidelity).toBe('partial');
  });

  it('does not append a context block when not disabled', () => {
    const { ctx } = makeContext();
    const { blocks } = renderButton(baseNode(), ctx);
    expect(blocks).toHaveLength(1);
  });

  it('accumulates multiple degradations (borderless + disabled + empty label)', () => {
    const { ctx } = makeContext();
    const { degradations } = renderButton(
      baseNode({ label: '', variant: 'borderless', disabled: true }),
      ctx,
    );
    const reasons = degradations.map((d) => d.reason).join(' | ');
    expect(reasons).toContain('empty label');
    expect(reasons).toContain('borderless');
    expect(reasons).toContain('disabled');
    expect(degradations).toHaveLength(3);
  });
});
