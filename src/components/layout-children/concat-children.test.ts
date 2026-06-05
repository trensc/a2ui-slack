import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import { concatChildren } from './concat-children.js';

const section = (text: string): KnownBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

function contextFrom(map: Record<string, RenderResult>): RenderContext {
  return {
    renderChild: (id) => map[id] ?? { blocks: [], degradations: [] },
    encodeActionId: () => 'a|c',
    surfaceKind: 'message',
  };
}

describe('concatChildren', () => {
  it('returns empty result for an empty id list', () => {
    const result = concatChildren([], contextFrom({}));
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([]);
  });

  it('concatenates blocks and degradations in order', () => {
    const context = contextFrom({
      a: { blocks: [section('a')], degradations: [] },
      b: {
        blocks: [section('b')],
        degradations: [
          { componentId: 'b', componentType: 'Text', fidelity: 'partial', reason: 'r' },
        ],
      },
    });
    const result = concatChildren(['a', 'b'], context);
    expect(result.blocks).toEqual([section('a'), section('b')]);
    expect(result.degradations).toEqual([
      { componentId: 'b', componentType: 'Text', fidelity: 'partial', reason: 'r' },
    ]);
  });
});
