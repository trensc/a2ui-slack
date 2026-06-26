import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import type { ResolvedComponent } from '../resolved-component.js';
import { renderColumn } from './column.js';
import { renderCard } from '../card/card.js';

const section = (text: string): KnownBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

function contextFrom(map: Record<string, RenderResult>): RenderContext {
  return {
    renderChild: (id) =>
      map[id] ?? {
        blocks: [section(`\`${id}\` not supported`)],
        degradations: [
          {
            componentId: id,
            componentType: 'Text',
            fidelity: 'dropped',
            reason: 'missing',
          },
        ],
      },
    encodeActionId: () => 'a|c',
    surfaceKind: 'message',
    customComponents: new Map(),
  };
}

describe('renderColumn', () => {
  it('renders no blocks for an empty children list', () => {
    const result = renderColumn(
      { type: 'Column', id: 'col', childrenIds: [] },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([]);
  });

  it('concatenates children in order, merging degradations', () => {
    const context = contextFrom({
      a: { blocks: [section('a')], degradations: [] },
      b: {
        blocks: [section('b1'), section('b2')],
        degradations: [
          {
            componentId: 'b',
            componentType: 'Video',
            fidelity: 'partial',
            reason: 'no video',
          },
        ],
      },
    });
    const result = renderColumn(
      { type: 'Column', id: 'col', childrenIds: ['a', 'b'] },
      context,
    );
    expect(result.blocks).toEqual([section('a'), section('b1'), section('b2')]);
    expect(result.degradations).toEqual([
      {
        componentId: 'b',
        componentType: 'Video',
        fidelity: 'partial',
        reason: 'no video',
      },
    ]);
  });

  it('propagates a missing child fallback and its report', () => {
    const result = renderColumn(
      { type: 'Column', id: 'col', childrenIds: ['ghost'] },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([section('`ghost` not supported')]);
    expect(result.degradations).toEqual([
      {
        componentId: 'ghost',
        componentType: 'Text',
        fidelity: 'dropped',
        reason: 'missing',
      },
    ]);
  });

  it('linearises a nested Column > Card > Column tree, merging the card report', () => {
    const outer = { type: 'Column' as const, id: 'outer', childrenIds: ['card'] };
    const tree: Record<string, ResolvedComponent> = {
      card: { type: 'Card', id: 'card', childId: 'inner' },
      inner: { type: 'Column', id: 'inner', childrenIds: ['leaf'] },
    };
    const context: RenderContext = {
      renderChild: (id) => {
        const node = tree[id];
        if (node === undefined) return { blocks: [section('leaf')], degradations: [] };
        if (node.type === 'Card') return renderCard(node, context);
        if (node.type === 'Column') return renderColumn(node, context);
        return { blocks: [], degradations: [] };
      },
      encodeActionId: () => 'a|c',
      surfaceKind: 'message',
      customComponents: new Map(),
    };
    const result = renderColumn(outer, context);
    expect(result.blocks).toEqual([
      { type: 'divider' },
      section('leaf'),
      { type: 'divider' },
    ]);
    expect(result.degradations).toEqual([
      {
        componentId: 'card',
        componentType: 'Card',
        fidelity: 'partial',
        reason: 'no container styling',
      },
    ]);
  });
});
