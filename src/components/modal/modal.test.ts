import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderModal } from './modal.js';

const context: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
  customComponents: new Map(),
};

const node: ResolvedOf<'Modal'> = {
  type: 'Modal',
  id: 'modal-1',
  triggerId: 'trigger-1',
  contentId: 'content-1',
};

describe('renderModal', () => {
  it('renders a single placeholder section block', () => {
    const { blocks } = renderModal(node, context);
    expect(blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'Modal not supported in this surface' },
      },
    ]);
  });

  it('always emits exactly one dropped degradation report', () => {
    const { degradations } = renderModal(node, context);
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toEqual({
      componentId: 'modal-1',
      componentType: 'Modal',
      fidelity: 'dropped',
      reason: 'Modal is not in the reduced catalog and cannot be sent to this surface',
    });
  });

  it('does not act on triggerId or contentId (no I/O, no renderChild)', () => {
    let renderChildCalls = 0;
    const spyCtx: RenderContext = {
      ...context,
      renderChild: () => {
        renderChildCalls += 1;
        return { blocks: [], degradations: [] };
      },
    };
    renderModal(node, spyCtx);
    expect(renderChildCalls).toBe(0);
  });
});
