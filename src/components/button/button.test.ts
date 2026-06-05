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
  context: RenderContext;
  decode: (id: string) => ActionIdRef | undefined;
} {
  let registry = emptyRegistry;
  const context: RenderContext = {
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
  return { context, decode };
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
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(baseNode(), context);
    const button = soleButton(firstActions(blocks));
    expect(button).toEqual({
      type: 'button',
      text: { type: 'plain_text', text: 'Save' },
    });
    expect(degradations).toEqual([]);
  });

  it('keeps a label exactly at 75 chars untouched', () => {
    const { context } = makeContext();
    const atLimit = 'a'.repeat(BUTTON_TEXT_MAX);
    const button = soleButton(
      firstActions(renderButton(baseNode({ label: atLimit }), context).blocks),
    );
    expect(button.text.text).toBe(atLimit);
  });

  it('clips a label over 75 chars to 75', () => {
    const { context } = makeContext();
    const over = 'a'.repeat(BUTTON_TEXT_MAX + 10);
    const button = soleButton(
      firstActions(renderButton(baseNode({ label: over }), context).blocks),
    );
    expect(button.text.text.length).toBe(BUTTON_TEXT_MAX);
  });

  it('substitutes a placeholder for an empty label and reports partial', () => {
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(baseNode({ label: '' }), context);
    const button = soleButton(firstActions(blocks));
    expect(button.text.text).toBe(PLACEHOLDER_LABEL);
    const degradation = degradationFor(degradations, 'empty label');
    expect(degradation.componentId).toBe('btn-1');
    expect(degradation.componentType).toBe('Button');
    expect(degradation.fidelity).toBe('partial');
  });

  it('encodes an action_id for a server action and emits no degradation', () => {
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(
      baseNode({ hasServerAction: true }),
      context,
    );
    const button = soleButton(firstActions(blocks));
    expect(button.action_id).toBeDefined();
    expect(degradations).toEqual([]);
    expect(button.url).toBeUndefined();
  });

  it('round-trips the encoded action_id back to the original ref', () => {
    const { context, decode } = makeContext();
    const button = soleButton(
      firstActions(renderButton(baseNode({ hasServerAction: true }), context).blocks),
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
    const { context } = makeContext();
    const button = soleButton(
      firstActions(
        renderButton(baseNode({ url: 'https://example.com' }), context).blocks,
      ),
    );
    expect(button.url).toBe('https://example.com');
    expect(button.action_id).toBeUndefined();
  });

  it('clips a url over 3000 chars to the limit', () => {
    const { context } = makeContext();
    const longUrl = `https://e.com/${'a'.repeat(URL_MAX)}`;
    const button = soleButton(
      firstActions(renderButton(baseNode({ url: longUrl }), context).blocks),
    );
    expect(button.url?.length).toBe(URL_MAX);
  });

  it('keeps a url exactly at 3000 chars untouched', () => {
    const { context } = makeContext();
    const atLimit = `https://e.com/${'a'.repeat(URL_MAX - 14)}`;
    expect(atLimit.length).toBe(URL_MAX);
    const button = soleButton(
      firstActions(renderButton(baseNode({ url: atLimit }), context).blocks),
    );
    expect(button.url).toBe(atLimit);
  });

  it('carries BOTH url and action_id when a url button also has a server action', () => {
    const { context, decode } = makeContext();
    const button = soleButton(
      firstActions(
        renderButton(baseNode({ url: 'https://x.com', hasServerAction: true }), context)
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
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(
      baseNode({ variant: 'primary' }),
      context,
    );
    expect(soleButton(firstActions(blocks)).style).toBe('primary');
    expect(degradations).toEqual([]);
  });

  it('maps variant borderless to default style and reports partial', () => {
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(
      baseNode({ variant: 'borderless' }),
      context,
    );
    expect(soleButton(firstActions(blocks)).style).toBeUndefined();
    expect(degradationFor(degradations, 'borderless').fidelity).toBe('partial');
  });

  it('omits style when no variant is set', () => {
    const { context } = makeContext();
    const button = soleButton(firstActions(renderButton(baseNode(), context).blocks));
    expect(button.style).toBeUndefined();
  });

  it('appends a context note and reports partial for a disabled button', () => {
    const { context } = makeContext();
    const { blocks, degradations } = renderButton(baseNode({ disabled: true }), context);
    expect(blocks).toHaveLength(2);
    // The button is still rendered.
    soleButton(firstActions(blocks));
    const contextBlock = blocks[1];
    if (contextBlock === undefined || contextBlock.type !== 'context') {
      throw new Error('expected a context block second');
    }
    const note = contextBlock.elements[0];
    expect(note).toEqual({ type: 'mrkdwn', text: DISABLED_NOTE });
    expect(degradationFor(degradations, 'disabled').fidelity).toBe('partial');
  });

  it('does not append a context block when not disabled', () => {
    const { context } = makeContext();
    const { blocks } = renderButton(baseNode(), context);
    expect(blocks).toHaveLength(1);
  });

  it('accumulates multiple degradations (borderless + disabled + empty label)', () => {
    const { context } = makeContext();
    const { degradations } = renderButton(
      baseNode({ label: '', variant: 'borderless', disabled: true }),
      context,
    );
    const reasons = degradations.map((d) => d.reason).join(' | ');
    expect(reasons).toContain('empty label');
    expect(reasons).toContain('borderless');
    expect(reasons).toContain('disabled');
    expect(degradations).toHaveLength(3);
  });
});
