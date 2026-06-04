import { describe, expect, it } from 'vitest';
import { decodeActionId, emptyRegistry } from '../action-id/action-id.js';
import type { ResolvedComponent } from '../components/resolved-component.js';
import { resolveTree } from './resolve-tree.js';
import { assembleSurface } from './assemble-surface.js';

function build(nodes: ResolvedComponent[], root: string) {
  return resolveTree({ root, nodes });
}

function assemble(
  nodes: ResolvedComponent[],
  root: string,
  surfaceKind: 'message' | 'modal' | 'home' = 'message',
) {
  return assembleSurface({
    tree: build(nodes, root),
    surfaceId: 'surf1',
    surfaceKind,
    registry: emptyRegistry,
  });
}

describe('assembleSurface', () => {
  it('renders a single leaf to its block with no notices or registry growth', () => {
    const result = assemble([{ type: 'Text', id: 't1', text: 'hi' }], 't1');
    expect(result.blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'hi' } },
    ]);
    expect(result.notices).toEqual([]);
    expect(result.degradations).toEqual([]);
    expect(result.registry.byToken.size).toBe(0);
  });

  it('flattens container children into a flat block list in order', () => {
    const result = assemble(
      [
        { type: 'Column', id: 'col', childrenIds: ['a', 'b'] },
        { type: 'Text', id: 'a', text: 'first' },
        { type: 'Text', id: 'b', text: 'second' },
      ],
      'col',
    );
    expect(result.blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'first' } },
      { type: 'section', text: { type: 'mrkdwn', text: 'second' } },
    ]);
  });

  it('tokenizes an input action_id with the surface id injected and registry grown', () => {
    const result = assemble(
      [
        {
          type: 'TextField',
          id: 'tf1',
          label: 'Name',
          value: '',
          path: '/name',
          multiline: false,
          disabled: false,
        },
      ],
      'tf1',
    );
    expect(result.registry.byToken.size).toBe(1);
    const [block] = result.blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    const decoded = decodeActionId(block.block_id ?? '', result.registry);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('decode failed');
    expect(decoded.ref).toEqual({
      kind: 'input',
      surfaceId: 'surf1',
      componentId: 'tf1',
      path: '/name',
    });
  });

  it('renders a missing-child reference as a marker block + a notice', () => {
    const result = assemble(
      [{ type: 'Column', id: 'col', childrenIds: ['gone'] }],
      'col',
    );
    expect(result.blocks).toHaveLength(1);
    const [block] = result.blocks;
    if (block?.type !== 'section' || block.text?.type !== 'mrkdwn') {
      throw new Error('expected a section');
    }
    expect(block.text.text).toContain('missing component');
    expect(result.notices).toEqual(['missing component: gone']);
  });

  it('aggregates child degradations up to the surface result', () => {
    const result = assemble(
      [
        { type: 'Column', id: 'col', childrenIds: ['v'] },
        { type: 'Video', id: 'v', url: 'https://x/v.mp4' },
      ],
      'col',
    );
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0]).toMatchObject({
      componentId: 'v',
      componentType: 'Video',
    });
  });

  it('caps a message surface at 50 blocks with a marker + notice', () => {
    const texts: ResolvedComponent[] = Array.from({ length: 60 }, (_, i) => ({
      type: 'Text',
      id: `t${String(i)}`,
      text: `line ${String(i)}`,
    }));
    const col: ResolvedComponent = {
      type: 'Column',
      id: 'col',
      childrenIds: texts.map((t) => t.id),
    };
    const result = assemble([col, ...texts], 'col');
    expect(result.blocks).toHaveLength(50);
    const last = result.blocks[49];
    if (last?.type !== 'context') throw new Error('expected a context marker');
    expect(result.notices).toEqual(['11 block(s) hidden (Slack 50-block limit)']);
  });

  it('uses the 100-block view cap so a 60-block modal is not truncated', () => {
    const texts: ResolvedComponent[] = Array.from({ length: 60 }, (_, i) => ({
      type: 'Text',
      id: `t${String(i)}`,
      text: `line ${String(i)}`,
    }));
    const col: ResolvedComponent = {
      type: 'Column',
      id: 'col',
      childrenIds: texts.map((t) => t.id),
    };
    const result = assemble([col, ...texts], 'col', 'modal');
    expect(result.blocks).toHaveLength(60);
    expect(result.notices).toEqual([]);
  });
});
