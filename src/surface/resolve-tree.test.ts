import { describe, expect, it } from 'vitest';
import type { ResolvedComponent } from '../components/resolved-component.js';
import { resolveTree } from './resolve-tree.js';

describe('resolveTree (skeleton)', () => {
  it('indexes resolved nodes by id and preserves the root', () => {
    const card: ResolvedComponent = { type: 'Card', id: 'root', childId: 'label' };
    const label: ResolvedComponent = { type: 'Text', id: 'label', text: 'hi' };
    const tree = resolveTree({ root: 'root', nodes: [card, label] });
    expect(tree.root).toBe('root');
    expect(tree.byId.get('root')).toBe(card);
    expect(tree.byId.get('label')).toBe(label);
    expect(tree.byId.size).toBe(2);
  });

  it('yields an empty index for no nodes', () => {
    const tree = resolveTree({ root: 'root', nodes: [] });
    expect(tree.byId.size).toBe(0);
    expect(tree.root).toBe('root');
  });
});
