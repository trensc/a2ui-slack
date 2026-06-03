import { describe, expect, it } from 'vitest';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId,
} from '../../action-id/action-id.js';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderSlider } from './slider.js';

function context(surfaceKind: RenderContext['surfaceKind']): RenderContext {
  return {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => `id|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
    surfaceKind,
  };
}

function node(overrides: Partial<ResolvedOf<'Slider'>> = {}): ResolvedOf<'Slider'> {
  return {
    type: 'Slider',
    id: 'sl1',
    min: 0,
    max: 10,
    value: 5,
    path: '/level',
    ...overrides,
  };
}

describe('renderSlider', () => {
  it('renders a stepped static_select in an actions block (message) + partial report', () => {
    const { blocks, degradations } = renderSlider(node(), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].options).toHaveLength(11);
    expect(block.elements[0].action_id).toBe('id|input|sl1|/level');
    expect(block.elements[0].initial_option).toEqual({
      text: { type: 'plain_text', text: '5' },
      value: '5',
    });
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toMatchObject({
      componentId: 'sl1',
      componentType: 'Slider',
      fidelity: 'partial',
    });
    expect(degradations[0]?.reason).toContain('slider');
  });

  it('snaps the initial value to the nearest step', () => {
    const { blocks } = renderSlider(node({ value: 7.4 }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].initial_option?.value).toBe('7');
  });

  it('clamps a value below the range to min', () => {
    const { blocks } = renderSlider(node({ value: -5 }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].initial_option?.value).toBe('0');
  });

  it('clamps a value above the range to max', () => {
    const { blocks } = renderSlider(node({ value: 99 }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].initial_option?.value).toBe('10');
  });

  it('renders an input block for a modal', () => {
    const { blocks } = renderSlider(node(), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.element.type).toBe('static_select');
    expect(block.dispatch_action).toBeUndefined();
  });

  it('renders an input block for the home surface', () => {
    const { blocks } = renderSlider(node(), context('home'));
    expect(blocks[0]?.type).toBe('input');
  });

  it('produces exactly 100 options at the boundary range', () => {
    const { blocks } = renderSlider(node({ min: 0, max: 99 }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].options).toHaveLength(100);
  });

  it('falls back to a number input when the range exceeds 100 steps (message)', () => {
    const { blocks, degradations } = renderSlider(
      node({ min: 0, max: 100, value: 42 }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'number_input') {
      throw new Error('expected number_input');
    }
    expect(block.dispatch_action).toBe(true);
    expect(block.element.initial_value).toBe('42');
    expect(block.element.min_value).toBe('0');
    expect(block.element.max_value).toBe('100');
    expect(block.element.dispatch_action_config).toEqual({
      trigger_actions_on: ['on_enter_pressed'],
    });
    expect(degradations).toHaveLength(1);
    expect(degradations[0]?.reason).toContain('100');
  });

  it('number fallback in a modal has no dispatch_action', () => {
    const { blocks } = renderSlider(
      node({ min: 0, max: 100, value: 42 }),
      context('modal'),
    );
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'number_input') {
      throw new Error('expected number_input');
    }
    expect(block.dispatch_action).toBeUndefined();
    expect(block.element.dispatch_action_config).toBeUndefined();
  });

  it('round-trips the path through the real codec', () => {
    const path = '/levels/0~1x|y';
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
    const { blocks } = renderSlider(node({ path }), ctx);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    const decoded = decodeActionId(block.elements[0].action_id ?? '', registry);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.ref.path).toBe(path);
  });
});
