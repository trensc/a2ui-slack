import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import { renderCard } from './card.js';

const section = (text: string): KnownBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});
const divider: KnownBlock = { type: 'divider' };

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

describe('renderCard', () => {
  it('wraps the single child in dividers and reports lost container styling', () => {
    const context = contextFrom({
      body: { blocks: [section('inner')], degradations: [] },
    });
    const result = renderCard({ type: 'Card', id: 'card', childId: 'body' }, context);
    expect(result.blocks).toEqual([divider, section('inner'), divider]);
    expect(result.degradations).toEqual([
      {
        componentId: 'card',
        componentType: 'Card',
        fidelity: 'partial',
        reason: 'no container styling',
      },
    ]);
  });

  it('wraps an empty-bodied child (just two dividers) and still reports', () => {
    const context = contextFrom({ body: { blocks: [], degradations: [] } });
    const result = renderCard({ type: 'Card', id: 'card', childId: 'body' }, context);
    expect(result.blocks).toEqual([divider, divider]);
    expect(result.degradations).toEqual([
      {
        componentId: 'card',
        componentType: 'Card',
        fidelity: 'partial',
        reason: 'no container styling',
      },
    ]);
  });

  it('propagates a missing child fallback and merges its report after the card report', () => {
    const result = renderCard(
      { type: 'Card', id: 'card', childId: 'ghost' },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([divider, section('`ghost` not supported'), divider]);
    expect(result.degradations).toEqual([
      {
        componentId: 'card',
        componentType: 'Card',
        fidelity: 'partial',
        reason: 'no container styling',
      },
      {
        componentId: 'ghost',
        componentType: 'Text',
        fidelity: 'dropped',
        reason: 'missing',
      },
    ]);
  });
});
