import { describe, expect, it } from 'vitest';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId,
} from '../../action-id/action-id.js';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderCheckBox } from './check-box.js';

function context(surfaceKind: RenderContext['surfaceKind']): RenderContext {
  return {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => `id|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
    surfaceKind,
    customComponents: new Map(),
  };
}

function node(overrides: Partial<ResolvedOf<'CheckBox'>> = {}): ResolvedOf<'CheckBox'> {
  return {
    type: 'CheckBox',
    id: 'cb1',
    label: 'Accept terms',
    checked: false,
    path: '/accepted',
    ...overrides,
  };
}

describe('renderCheckBox', () => {
  it('renders an unchecked checkbox in an actions block for a message', () => {
    const { blocks, degradations } = renderCheckBox(node(), context('message'));
    expect(degradations).toEqual([]);
    expect(blocks).toEqual([
      {
        type: 'actions',
        block_id: 'id|input|cb1|/accepted',
        elements: [
          {
            type: 'checkboxes',
            action_id: 'id|input|cb1|/accepted',
            options: [
              {
                text: { type: 'plain_text', text: 'Accept terms' },
                value: 'true',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('sets initial_options when checked', () => {
    const { blocks } = renderCheckBox(node({ checked: true }), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'checkboxes') {
      throw new Error('expected checkboxes');
    }
    expect(block.elements[0].initial_options).toEqual([
      { text: { type: 'plain_text', text: 'Accept terms' }, value: 'true' },
    ]);
  });

  it('renders an input block for a modal', () => {
    const { blocks } = renderCheckBox(node(), context('modal'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.label).toEqual({ type: 'plain_text', text: 'Accept terms' });
    expect(block.optional).toBe(true);
    if (block.element.type !== 'checkboxes') throw new Error('expected checkboxes');
    expect(block.element.action_id).toBe('id|input|cb1|/accepted');
  });

  it('renders an input block for the home surface', () => {
    const { blocks } = renderCheckBox(node(), context('home'));
    const [block] = blocks;
    expect(block?.type).toBe('input');
  });

  it('clips the option text to 150 chars', () => {
    const { blocks } = renderCheckBox(
      node({ label: 'y'.repeat(200) }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'checkboxes') {
      throw new Error('expected checkboxes');
    }
    const text = block.elements[0].options[0]?.text.text ?? '';
    expect(text).toHaveLength(150);
    expect(text.endsWith('…')).toBe(true);
  });

  it('clips the modal input label to 2000 chars (option text stays 150)', () => {
    const { blocks } = renderCheckBox(
      node({ label: 'z'.repeat(2100) }),
      context('modal'),
    );
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.label.text).toHaveLength(2000);
    if (block.element.type !== 'checkboxes') throw new Error('expected checkboxes');
    expect(block.element.options[0]?.text.text).toHaveLength(150);
  });

  it('substitutes a placeholder + reports for an empty label', () => {
    const { blocks, degradations } = renderCheckBox(
      node({ label: '' }),
      context('modal'),
    );
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'checkboxes') {
      throw new Error('expected checkboxes input');
    }
    expect(block.label).toEqual({ type: 'plain_text', text: 'Checkbox' });
    expect(block.element.options[0]?.text.text).toBe('Checkbox');
    expect(degradations).toEqual([
      {
        componentId: 'cb1',
        componentType: 'CheckBox',
        fidelity: 'partial',
        reason: 'empty checkbox label substituted with placeholder',
      },
    ]);
  });

  it('round-trips the path through the real codec', () => {
    const path = '/flags/agreed~1now';
    let registry = emptyRegistry;
    const context: RenderContext = {
      renderChild: () => ({ blocks: [], degradations: [] }),
      encodeActionId: (ref) => {
        const full: ActionIdRef = { ...ref, surfaceId: 's1' };
        const result = encodeActionId(full, registry);
        registry = result.registry;
        return result.id;
      },
      surfaceKind: 'modal',
      customComponents: new Map(),
    };
    const { blocks } = renderCheckBox(node({ path }), context);
    const [block] = blocks;
    if (block?.type !== 'input' || block.element.type !== 'checkboxes') {
      throw new Error('expected checkboxes input');
    }
    const decoded = decodeActionId(block.element.action_id ?? '', registry);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.ref.path).toBe(path);
  });
});
