import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import { renderList } from './list.js';

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

describe('renderList', () => {
  it('renders no blocks for an empty (pre-expanded) list', () => {
    const result = renderList(
      { type: 'List', id: 'list', childrenIds: [] },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([]);
  });

  it('concatenates expanded child runs in order, merging degradations', () => {
    const context = contextFrom({
      r1: { blocks: [section('row1')], degradations: [] },
      r2: {
        blocks: [section('row2')],
        degradations: [
          {
            componentId: 'r2',
            componentType: 'Icon',
            fidelity: 'dropped',
            reason: 'unknown',
          },
        ],
      },
    });
    const result = renderList(
      { type: 'List', id: 'list', childrenIds: ['r1', 'r2'] },
      context,
    );
    expect(result.blocks).toEqual([section('row1'), section('row2')]);
    expect(result.degradations).toEqual([
      {
        componentId: 'r2',
        componentType: 'Icon',
        fidelity: 'dropped',
        reason: 'unknown',
      },
    ]);
  });

  it('propagates a missing child fallback and its report', () => {
    const result = renderList(
      { type: 'List', id: 'list', childrenIds: ['ghost'] },
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
});
