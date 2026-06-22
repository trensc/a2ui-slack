import { describe, expect, it } from 'vitest';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId,
} from '../../action-id/action-id.js';
import type { RenderContext } from '../render-context.js';
import type { ChoiceOption, ResolvedOf } from '../resolved-component.js';
import { renderChoicePicker } from './choice-picker.js';

function context(surfaceKind: RenderContext['surfaceKind']): RenderContext {
  return {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => `id|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
    surfaceKind,
    customComponents: new Map(),
  };
}

function options(count: number): ChoiceOption[] {
  return Array.from({ length: count }, (_unused, index) => ({
    label: `Option ${String(index)}`,
    value: `v${String(index)}`,
  }));
}

function node(
  overrides: Partial<ResolvedOf<'ChoicePicker'>> = {},
): ResolvedOf<'ChoicePicker'> {
  return {
    type: 'ChoicePicker',
    id: 'cp1',
    options: options(3),
    selected: [],
    multiple: false,
    path: '/choice',
    ...overrides,
  };
}

describe('renderChoicePicker', () => {
  it('single + ≤10 options → radio_buttons in an actions block (message)', () => {
    const { blocks, degradations } = renderChoicePicker(node(), context('message'));
    expect(degradations).toEqual([]);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'radio_buttons') {
      throw new Error('expected radio_buttons');
    }
    expect(block.elements[0].options).toHaveLength(3);
    expect(block.elements[0].action_id).toBe('id|input|cp1|/choice');
    expect(block.elements[0].initial_option).toBeUndefined();
  });

  it('single radio sets initial_option from the first selected value', () => {
    const { blocks } = renderChoicePicker(node({ selected: ['v1'] }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'radio_buttons') {
      throw new Error('expected radio_buttons');
    }
    expect(block.elements[0].initial_option).toEqual({
      text: { type: 'plain_text', text: 'Option 1' },
      value: 'v1',
    });
  });

  it('ignores a selected value not present in the options', () => {
    const { blocks } = renderChoicePicker(
      node({ selected: ['nope'] }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'radio_buttons') {
      throw new Error('expected radio_buttons');
    }
    expect(block.elements[0].initial_option).toBeUndefined();
  });

  it('single + >10 options → static_select', () => {
    const { blocks, degradations } = renderChoicePicker(
      node({ options: options(11), selected: ['v2'] }),
      context('message'),
    );
    expect(degradations).toEqual([]);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].options).toHaveLength(11);
    expect(block.elements[0].initial_option).toEqual({
      text: { type: 'plain_text', text: 'Option 2' },
      value: 'v2',
    });
  });

  it('multiple + ≤10 options → checkboxes with initial_options', () => {
    const { blocks } = renderChoicePicker(
      node({ multiple: true, selected: ['v0', 'v2'] }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'checkboxes') {
      throw new Error('expected checkboxes');
    }
    expect(block.elements[0].initial_options).toEqual([
      { text: { type: 'plain_text', text: 'Option 0' }, value: 'v0' },
      { text: { type: 'plain_text', text: 'Option 2' }, value: 'v2' },
    ]);
  });

  it('multiple checkboxes omits initial_options when nothing selected', () => {
    const { blocks } = renderChoicePicker(node({ multiple: true }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'checkboxes') {
      throw new Error('expected checkboxes');
    }
    expect(block.elements[0].initial_options).toBeUndefined();
  });

  it('multiple + >10 options → multi_static_select', () => {
    const { blocks } = renderChoicePicker(
      node({ multiple: true, options: options(11), selected: ['v0'] }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'multi_static_select') {
      throw new Error('expected multi_static_select');
    }
    expect(block.elements[0].options).toHaveLength(11);
    expect(block.elements[0].initial_options).toEqual([
      { text: { type: 'plain_text', text: 'Option 0' }, value: 'v0' },
    ]);
  });

  it('multi_static_select omits initial_options when nothing selected', () => {
    const { blocks } = renderChoicePicker(
      node({ multiple: true, options: options(11) }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'multi_static_select') {
      throw new Error('expected multi_static_select');
    }
    expect(block.elements[0].initial_options).toBeUndefined();
  });

  it('renders at exactly 10 options as radio (no degradation)', () => {
    const { blocks, degradations } = renderChoicePicker(
      node({ options: options(10) }),
      context('message'),
    );
    expect(degradations).toEqual([]);
    const [block] = blocks;
    if (block?.type !== 'actions') throw new Error('expected actions');
    expect(block.elements[0]?.type).toBe('radio_buttons');
  });

  it('renders at exactly 100 options as static_select (no degradation)', () => {
    const { blocks, degradations } = renderChoicePicker(
      node({ options: options(100) }),
      context('message'),
    );
    expect(degradations).toEqual([]);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].options).toHaveLength(100);
  });

  it('clamps over 100 options to 100 with a partial report', () => {
    const { blocks, degradations } = renderChoicePicker(
      node({ options: options(150) }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'static_select') {
      throw new Error('expected static_select');
    }
    expect(block.elements[0].options).toHaveLength(100);
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toMatchObject({
      componentId: 'cp1',
      componentType: 'ChoicePicker',
      fidelity: 'partial',
    });
    expect(degradations[0]?.reason).toContain('100');
  });

  it('drops an empty option list with a report', () => {
    const { blocks, degradations } = renderChoicePicker(
      node({ options: [] }),
      context('message'),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('section');
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(degradations[0]?.reason).toContain('no options');
  });

  it('clips option text to 150 chars', () => {
    const { blocks } = renderChoicePicker(
      node({ options: [{ label: 'a'.repeat(200), value: 'v' }] }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'radio_buttons') {
      throw new Error('expected radio_buttons');
    }
    const text = block.elements[0].options[0]?.text.text ?? '';
    expect(text).toHaveLength(150);
    expect(text.endsWith('…')).toBe(true);
  });

  it('renders an input block for a modal', () => {
    const { blocks } = renderChoicePicker(node(), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.label.text.length).toBeGreaterThan(0);
    expect(block.optional).toBe(true);
    expect(block.element.type).toBe('radio_buttons');
  });

  it('renders an input block for the home surface', () => {
    const { blocks } = renderChoicePicker(node(), context('home'));
    expect(blocks[0]?.type).toBe('input');
  });

  it('uses a plural label for a multi-select input block', () => {
    const { blocks } = renderChoicePicker(node({ multiple: true }), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.label.text).toContain('options');
  });

  it('clamps both options and overflowing selected values', () => {
    const { blocks } = renderChoicePicker(
      node({ multiple: true, options: options(150), selected: ['v0', 'v149'] }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'multi_static_select') {
      throw new Error('expected multi_static_select');
    }
    // v149 was clamped out of the option set, so it is not an initial option.
    expect(block.elements[0].initial_options).toEqual([
      { text: { type: 'plain_text', text: 'Option 0' }, value: 'v0' },
    ]);
  });

  it('round-trips the path through the real codec', () => {
    const path = '/picks/0~1weird|x';
    let registry = emptyRegistry;
    const context: RenderContext = {
      renderChild: () => ({ blocks: [], degradations: [] }),
      encodeActionId: (ref) => {
        const full: ActionIdRef = { ...ref, surfaceId: 's1' };
        const result = encodeActionId(full, registry);
        registry = result.registry;
        return result.id;
      },
      surfaceKind: 'message',
      customComponents: new Map(),
    };
    const { blocks } = renderChoicePicker(node({ path }), context);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'radio_buttons') {
      throw new Error('expected radio_buttons');
    }
    const decoded = decodeActionId(block.elements[0].action_id ?? '', registry);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.ref.path).toBe(path);
  });
});
