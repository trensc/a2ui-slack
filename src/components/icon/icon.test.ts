import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderIcon } from './icon.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

function icon(partial: Partial<ResolvedOf<'Icon'>>): ResolvedOf<'Icon'> {
  return { type: 'Icon', id: 'ico-1', name: 'check', ...partial };
}

describe('renderIcon', () => {
  it('renders a known icon as an emoji shortcode in a context block', () => {
    const result = renderIcon(icon({ name: 'check' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'context', elements: [{ type: 'mrkdwn', text: ':white_check_mark:' }] },
    ]);
    expect(result.degradations).toEqual([]);
  });

  it('maps a different known name to its own emoji', () => {
    const result = renderIcon(icon({ name: 'warning' }), ctx);
    expect(result.blocks).toEqual([
      { type: 'context', elements: [{ type: 'mrkdwn', text: ':warning:' }] },
    ]);
  });

  it('drops an unknown icon name with a dropped report naming the icon', () => {
    const result = renderIcon(icon({ id: 'ico-x', name: 'flux-capacitor' }), ctx);
    expect(result.blocks).toHaveLength(1);
    expect(result.degradations).toEqual([
      {
        componentId: 'ico-x',
        componentType: 'Icon',
        fidelity: 'dropped',
        reason: 'unknown icon name: flux-capacitor',
      },
    ]);
  });
});
