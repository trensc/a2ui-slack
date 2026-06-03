import { describe, expect, it } from 'vitest';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId,
} from '../../action-id/action-id.js';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderTextField } from './text-field.js';

function context(surfaceKind: RenderContext['surfaceKind']): RenderContext {
  return {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => `id|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
    surfaceKind,
  };
}

function node(overrides: Partial<ResolvedOf<'TextField'>> = {}): ResolvedOf<'TextField'> {
  return {
    type: 'TextField',
    id: 'tf1',
    label: 'Name',
    value: 'Ada',
    path: '/user/name',
    multiline: false,
    disabled: false,
    ...overrides,
  };
}

describe('renderTextField', () => {
  it('renders a message input with dispatch_action on enter', () => {
    const { blocks, degradations } = renderTextField(node(), context('message'));
    expect(degradations).toEqual([]);
    expect(blocks).toEqual([
      {
        type: 'input',
        block_id: 'id|input|tf1|/user/name',
        label: { type: 'plain_text', text: 'Name' },
        dispatch_action: true,
        element: {
          type: 'plain_text_input',
          action_id: 'id|input|tf1|/user/name',
          initial_value: 'Ada',
          dispatch_action_config: { trigger_actions_on: ['on_enter_pressed'] },
        },
      },
    ]);
  });

  it('renders a modal input without dispatch_action', () => {
    const { blocks, degradations } = renderTextField(node(), context('modal'));
    expect(degradations).toEqual([]);
    const [block] = blocks;
    expect(block).toMatchObject({ type: 'input' });
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.dispatch_action).toBeUndefined();
    expect(block.element).toEqual({
      type: 'plain_text_input',
      action_id: 'id|input|tf1|/user/name',
      initial_value: 'Ada',
    });
  });

  it('renders home surface as a plain input', () => {
    const { blocks } = renderTextField(node(), context('home'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.dispatch_action).toBeUndefined();
  });

  it('sets multiline when flagged', () => {
    const { blocks } = renderTextField(node({ multiline: true }), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'plain_text_input') {
      throw new Error('expected plain_text_input');
    }
    expect(block.element.multiline).toBe(true);
  });

  it('omits initial_value when value is empty', () => {
    const { blocks } = renderTextField(node({ value: '' }), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'plain_text_input') {
      throw new Error('expected plain_text_input');
    }
    expect(block.element.initial_value).toBeUndefined();
  });

  it('renders a disabled field read-only as a section with a partial report', () => {
    const { blocks, degradations } = renderTextField(
      node({ disabled: true }),
      context('message'),
    );
    expect(blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Name*\nAda' },
      },
    ]);
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toMatchObject({
      componentId: 'tf1',
      componentType: 'TextField',
      fidelity: 'partial',
    });
    expect(degradations[0]?.reason).toContain('disabled');
  });

  it('shows a placeholder when a disabled field has no value', () => {
    const { blocks } = renderTextField(
      node({ disabled: true, value: '' }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'section' || block.text?.type !== 'mrkdwn') {
      throw new Error('expected section');
    }
    expect(block.text.text).toBe('*Name*\n_empty_');
  });

  it('clips the label to 150 chars', () => {
    const { blocks } = renderTextField(
      node({ label: 'x'.repeat(200) }),
      context('modal'),
    );
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.label.text).toHaveLength(150);
    expect(block.label.text.endsWith('…')).toBe(true);
  });

  it('round-trips a path with special chars through the real codec', () => {
    const path = '/items/0/text~1weird|stuff';
    let registry = emptyRegistry;
    const ctx: RenderContext = {
      renderChild: () => ({ blocks: [], degradations: [] }),
      encodeActionId: (ref) => {
        const full: ActionIdRef = { ...ref, surfaceId: 's1' };
        const result = encodeActionId(full, registry);
        registry = result.registry;
        return result.id;
      },
      surfaceKind: 'message',
    };
    const { blocks } = renderTextField(node({ path }), ctx);
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    const decoded = decodeActionId(block.block_id ?? '', registry);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.ref.path).toBe(path);
    expect(decoded.ref.kind).toBe('input');
    expect(decoded.ref.componentId).toBe('tf1');
  });
});
