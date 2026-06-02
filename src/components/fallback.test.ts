import { describe, expect, it } from 'vitest';
import type { ResolvedComponent } from './resolved-component.js';
import { fallbackResult } from './fallback.js';

describe('fallbackResult', () => {
  it('emits exactly one non-empty mrkdwn section naming the component type', () => {
    const node: ResolvedComponent = {
      type: 'Slider',
      id: 's',
      min: 0,
      max: 10,
      value: 5,
      path: '/v',
    };
    const { blocks } = fallbackResult(node, 'not implemented');
    expect(blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: '`Slider` not supported' } },
    ]);
  });

  it('records a dropped degradation carrying the id, type and reason', () => {
    const node: ResolvedComponent = { type: 'Divider', id: 'd1' };
    const { degradations } = fallbackResult(node, 'not implemented');
    expect(degradations).toEqual([
      {
        componentId: 'd1',
        componentType: 'Divider',
        fidelity: 'dropped',
        reason: 'not implemented',
      },
    ]);
  });
});
