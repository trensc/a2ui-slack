import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import { renderRow } from './row.js';

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
  };
}

describe('renderRow', () => {
  it('collapses two simple text cells into one 2-up section.fields', () => {
    const ctx = contextFrom({
      k: { blocks: [section('*Priority*')], degradations: [] },
      v: { blocks: [section('High')], degradations: [] },
    });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['k', 'v'] }, ctx);
    expect(result.blocks).toEqual([
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*Priority*' },
          { type: 'mrkdwn', text: 'High' },
        ],
      },
    ]);
    expect(result.degradations).toEqual([]);
  });

  it('merges child degradations through the collapse path', () => {
    const ctx = contextFrom({
      k: {
        blocks: [section('k')],
        degradations: [
          { componentId: 'k', componentType: 'Text', fidelity: 'partial', reason: 'kd' },
        ],
      },
      v: { blocks: [section('v')], degradations: [] },
    });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['k', 'v'] }, ctx);
    expect(result.blocks).toHaveLength(1);
    expect(result.degradations).toEqual([
      { componentId: 'k', componentType: 'Text', fidelity: 'partial', reason: 'kd' },
    ]);
  });

  it('clips each collapsed field to the 2000-char limit', () => {
    const long = 'x'.repeat(2500);
    const ctx = contextFrom({
      k: { blocks: [section(long)], degradations: [] },
      v: { blocks: [section('v')], degradations: [] },
    });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['k', 'v'] }, ctx);
    const block = result.blocks[0];
    if (block?.type !== 'section' || block.fields === undefined)
      throw new Error('expected fields');
    expect(block.fields[0]?.text.length).toBe(2000);
  });

  it('falls back to a vertical stack when a cell is not a simple section', () => {
    const ctx = contextFrom({
      k: { blocks: [section('k')], degradations: [] },
      v: { blocks: [{ type: 'divider' }], degradations: [] },
    });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['k', 'v'] }, ctx);
    expect(result.blocks).toEqual([section('k'), { type: 'divider' }]);
    expect(result.degradations).toEqual([
      {
        componentId: 'row',
        componentType: 'Row',
        fidelity: 'partial',
        reason: 'row flattened to vertical',
      },
    ]);
  });

  it('falls back to vertical when the first cell is not collapsible', () => {
    const ctx = contextFrom({
      k: { blocks: [{ type: 'divider' }], degradations: [] },
      v: { blocks: [section('v')], degradations: [] },
    });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['k', 'v'] }, ctx);
    expect(result.blocks).toEqual([{ type: 'divider' }, section('v')]);
    expect(result.degradations[0]?.reason).toBe('row flattened to vertical');
  });

  it('flattens three children vertically with a partial report', () => {
    const ctx = contextFrom({
      a: { blocks: [section('a')], degradations: [] },
      b: { blocks: [section('b')], degradations: [] },
      c: {
        blocks: [section('c')],
        degradations: [
          { componentId: 'c', componentType: 'Video', fidelity: 'partial', reason: 'cd' },
        ],
      },
    });
    const result = renderRow(
      { type: 'Row', id: 'row', childrenIds: ['a', 'b', 'c'] },
      ctx,
    );
    expect(result.blocks).toEqual([section('a'), section('b'), section('c')]);
    expect(result.degradations).toEqual([
      {
        componentId: 'row',
        componentType: 'Row',
        fidelity: 'partial',
        reason: 'row flattened to vertical',
      },
      { componentId: 'c', componentType: 'Video', fidelity: 'partial', reason: 'cd' },
    ]);
  });

  it('flattens a single-child row vertically (no 2-up collapse)', () => {
    const ctx = contextFrom({ a: { blocks: [section('only')], degradations: [] } });
    const result = renderRow({ type: 'Row', id: 'row', childrenIds: ['a'] }, ctx);
    expect(result.blocks).toEqual([section('only')]);
    expect(result.degradations).toEqual([
      {
        componentId: 'row',
        componentType: 'Row',
        fidelity: 'partial',
        reason: 'row flattened to vertical',
      },
    ]);
  });

  it('handles an empty row: no blocks, just the partial report', () => {
    const result = renderRow(
      { type: 'Row', id: 'row', childrenIds: [] },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([
      {
        componentId: 'row',
        componentType: 'Row',
        fidelity: 'partial',
        reason: 'row flattened to vertical',
      },
    ]);
  });

  it('propagates a missing child fallback in the vertical path', () => {
    const ctx = contextFrom({ a: { blocks: [section('a')], degradations: [] } });
    const result = renderRow(
      { type: 'Row', id: 'row', childrenIds: ['a', 'ghost', 'x'] },
      ctx,
    );
    expect(result.blocks).toEqual([
      section('a'),
      section('`ghost` not supported'),
      section('`x` not supported'),
    ]);
    expect(result.degradations).toEqual([
      {
        componentId: 'row',
        componentType: 'Row',
        fidelity: 'partial',
        reason: 'row flattened to vertical',
      },
      {
        componentId: 'ghost',
        componentType: 'Text',
        fidelity: 'dropped',
        reason: 'missing',
      },
      { componentId: 'x', componentType: 'Text', fidelity: 'dropped', reason: 'missing' },
    ]);
  });
});
