import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { renderCustom } from './render-custom.js';
import { buildCustomRegistry } from './custom-component.js';
import type { KnownBlock } from '@slack/types';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';

const registry = buildCustomRegistry([
  {
    name: 'ApprovalCard',
    schema: z.object({
      onApprove: z.object({ action: z.string() }),
      comment: z.object({ path: z.string() }),
    }),
    actions: ['onApprove'],
    inputs: { comment: {} },
    render: (p, ctx) =>
      [
        { type: 'section', text: { type: 'mrkdwn', text: `*${String(p['title'])}*` } },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: ctx.action('onApprove'),
              text: { type: 'plain_text', text: 'OK' },
            },
            // Plain text inputs are not literally valid in an actions block per the Slack type
            // system, but this fixture only needs to exercise action_id wiring — cast it.
            {
              type: 'button',
              action_id: ctx.input('comment'),
              text: {
                type: 'plain_text',
                text: typeof p['comment'] === 'string' ? p['comment'] : '',
              },
            },
          ],
        },
      ] as KnownBlock[],
  },
  {
    name: 'Boom',
    schema: z.object({}),
    render: () => {
      throw new Error('kaboom');
    },
  },
]);

function ctx(overrides: Partial<RenderContext> = {}): RenderContext {
  const encoded: unknown[] = [];
  return {
    surfaceKind: 'message',
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => {
      encoded.push(ref);
      return `t|${String(encoded.length - 1)}`;
    },
    customComponents: registry,
    ...overrides,
  };
}

const node: ResolvedOf<'Custom'> = {
  type: 'Custom',
  id: 'c',
  name: 'ApprovalCard',
  props: { title: 'Deploy?', comment: 'hi' },
  actions: { onApprove: 'deploy' },
  inputs: { comment: '/note' },
};

describe('renderCustom', () => {
  it('renders the integrator blocks and wires action_ids', () => {
    const result = renderCustom(node, ctx());
    expect(result.blocks).toHaveLength(2);
    const actions = result.blocks[1] as { elements: { action_id: string }[] } | undefined;
    if (actions === undefined) throw new Error('expected a second block');
    expect(actions.elements[0]?.action_id).toBe('t|0'); // ctx.action('onApprove')
    expect(actions.elements[1]?.action_id).toBe('t|1'); // ctx.input('comment')
    expect(result.degradations).toHaveLength(0);
  });

  it('encodes the action value and custom marker into the ref', () => {
    const refs: unknown[] = [];
    renderCustom(
      node,
      ctx({
        encodeActionId: (ref) => {
          refs.push(ref);
          return 'x';
        },
      }),
    );
    expect(refs[0]).toMatchObject({ kind: 'action', componentId: 'c', action: 'deploy' });
    expect(refs[1]).toMatchObject({
      kind: 'input',
      componentId: 'c',
      path: '/note',
      custom: { component: 'ApprovalCard', param: 'comment' },
    });
  });

  it('degrades (no throw) when the render fn throws', () => {
    const boom: ResolvedOf<'Custom'> = { ...node, name: 'Boom', actions: {}, inputs: {} };
    const result = renderCustom(boom, ctx());
    expect(result.degradations[0]).toMatchObject({
      componentId: 'c',
      fidelity: 'dropped',
    });
    expect(result.degradations[0]?.reason).toContain('render of "Boom" threw');
    expect(result.degradations[0]?.reason).toContain('kaboom');
    expect(result.blocks).toHaveLength(1); // fallback block
  });

  it('degrades (via the render try/catch) when ctx.input names an undeclared param', () => {
    const reg = buildCustomRegistry([
      {
        name: 'Typo',
        schema: z.object({ comment: z.object({ path: z.string() }) }),
        inputs: { comment: {} },
        render: (_p, c) =>
          [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: c.input('coment') },
            },
          ] as KnownBlock[],
      },
    ]);
    const typoNode: ResolvedOf<'Custom'> = {
      ...node,
      name: 'Typo',
      actions: {},
      inputs: { comment: '/c' },
    };
    const result = renderCustom(typoNode, ctx({ customComponents: reg }));
    expect(result.degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(result.degradations[0]?.reason).toContain(
      'ctx.input: "coment" is not a declared input of "Typo"',
    );
  });

  it('degrades when ctx.action names an undeclared param (symmetric with ctx.input)', () => {
    const reg = buildCustomRegistry([
      {
        name: 'ActTypo',
        schema: z.object({ go: z.object({ action: z.string() }) }),
        actions: ['go'],
        render: (_p, c) => [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: c.action('g0'),
                text: { type: 'plain_text', text: 'x' },
              },
            ],
          },
        ],
      },
    ]);
    const n: ResolvedOf<'Custom'> = {
      ...node,
      name: 'ActTypo',
      actions: { go: 'run' },
      inputs: {},
    };
    const result = renderCustom(n, ctx({ customComponents: reg }));
    expect(result.degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(result.degradations[0]?.reason).toContain(
      'ctx.action: "g0" is not a declared action of "ActTypo"',
    );
  });

  it('records a partial degradation when a wired action resolved no value', () => {
    const reg = buildCustomRegistry([
      {
        name: 'NoVal',
        schema: z.object({ onApprove: z.unknown().optional() }),
        actions: ['onApprove'],
        render: (_p, c) => [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: c.action('onApprove'),
                text: { type: 'plain_text', text: 'x' },
              },
            ],
          },
        ],
      },
    ]);
    // The agent sent a non-{event:{name}} Action, so resolveCustom left actions empty.
    const n: ResolvedOf<'Custom'> = { ...node, name: 'NoVal', actions: {}, inputs: {} };
    const result = renderCustom(n, ctx({ customComponents: reg }));
    expect(result.degradations[0]).toMatchObject({
      componentId: 'c',
      componentType: 'Custom',
      fidelity: 'partial',
    });
    expect(result.degradations[0]?.reason).toContain(
      'custom action "onApprove" of "NoVal" resolved no action value',
    );
    // Still renders (not a hard fallback) — the button just lacks a disambiguator.
    expect(result.blocks).toHaveLength(1);
  });

  it('degrades when render returns a non-block-array (string entry)', () => {
    const bad = buildCustomRegistry([
      { name: 'Bad', schema: z.object({}), render: () => ['nope' as unknown as never] },
    ]);
    const badNode: ResolvedOf<'Custom'> = {
      ...node,
      name: 'Bad',
      actions: {},
      inputs: {},
    };
    const result = renderCustom(badNode, ctx({ customComponents: bad }));
    expect(result.degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(result.degradations[0]?.reason).toContain(
      'render of "Bad" did not return Block Kit blocks',
    );
  });

  it('degrades when an entry is an object without a string type (kills the isBlock sub-mutant)', () => {
    const bad = buildCustomRegistry([
      {
        name: 'NoType',
        schema: z.object({}),
        render: () => [{ notType: 1 } as unknown as never],
      },
    ]);
    const badNode: ResolvedOf<'Custom'> = {
      ...node,
      name: 'NoType',
      actions: {},
      inputs: {},
    };
    expect(
      renderCustom(badNode, ctx({ customComponents: bad })).degradations[0],
    ).toMatchObject({ fidelity: 'dropped' });
  });

  it('accepts a block whose type is not in the basic catalog (e.g. markdown) — Slack validates types at post time', () => {
    // The structural guard only requires an object with a string `type`; it does NOT
    // enumerate valid Slack block types (that set drifts every @slack/types release).
    // A valid `markdown` block must pass through, not degrade.
    const md = buildCustomRegistry([
      {
        name: 'Md',
        schema: z.object({}),
        render: () => [{ type: 'markdown', text: '**hi**' } as unknown as never],
      },
    ]);
    const mdNode: ResolvedOf<'Custom'> = { ...node, name: 'Md', actions: {}, inputs: {} };
    const result = renderCustom(mdNode, ctx({ customComponents: md }));
    expect(result.degradations).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);
  });

  it('records a partial degradation when a declared input has no write-back path', () => {
    // The agent omitted comment's {path}, so node.inputs.comment is absent → path ''.
    // The user's input cannot round-trip; the renderer flags it rather than dropping silently.
    const sparseNode: ResolvedOf<'Custom'> = { ...node, inputs: {} };
    const result = renderCustom(sparseNode, ctx());
    const partial = result.degradations.find((d) => d.fidelity === 'partial');
    expect(partial).toMatchObject({ componentId: 'c', componentType: 'Custom' });
    expect(partial?.reason).toContain('no write-back binding');
    expect(result.blocks).toHaveLength(2); // still renders; the binding is just dead
  });

  it('records no write-back degradation when the input has a real path', () => {
    const result = renderCustom(node, ctx()); // node.inputs.comment === '/note'
    expect(result.degradations).toHaveLength(0);
  });

  it('degrades when the component is missing from the registry', () => {
    const orphan: ResolvedOf<'Custom'> = { ...node, name: 'Ghost' };
    const result = renderCustom(orphan, ctx({ customComponents: new Map() }));
    expect(result.degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(result.degradations[0]?.reason).toBe(
      'custom component "Ghost" is not registered',
    );
  });

  it('degrades when only SOME entries are blocks (a valid block mixed with a bad one)', () => {
    // A mix forces `.every` (all entries must be blocks) over `.some` — with `.some`
    // the array would wrongly pass on the strength of the one valid block.
    const mixed = buildCustomRegistry([
      {
        name: 'Mixed',
        schema: z.object({}),
        render: () =>
          [
            { type: 'section', text: { type: 'mrkdwn', text: 'ok' } },
            'nope' as unknown as never,
          ] as KnownBlock[],
      },
    ]);
    const mixedNode: ResolvedOf<'Custom'> = {
      ...node,
      name: 'Mixed',
      actions: {},
      inputs: {},
    };
    const result = renderCustom(mixedNode, ctx({ customComponents: mixed }));
    expect(result.degradations[0]).toMatchObject({ fidelity: 'dropped' });
    expect(result.degradations[0]?.reason).toContain('did not return Block Kit blocks');
  });

  it('degrades (not throws) when render returns a null entry', () => {
    // A `null` entry must be rejected by the structural guard, not crash isBlock —
    // distinguishes the `entry !== null` check from an always-true mutant.
    const nullish = buildCustomRegistry([
      {
        name: 'Nullish',
        schema: z.object({}),
        render: () => [null as unknown as never],
      },
    ]);
    const nullNode: ResolvedOf<'Custom'> = {
      ...node,
      name: 'Nullish',
      actions: {},
      inputs: {},
    };
    const result = renderCustom(nullNode, ctx({ customComponents: nullish }));
    expect(result.degradations[0]?.reason).toContain('did not return Block Kit blocks');
  });

  it('encodes an action ref without action field when node.actions has no value for the param', () => {
    // node.actions[paramName] is undefined at runtime (key absent) — exercises the
    // `value === undefined ? ref : {...}` branch on line 60 of render-custom.ts.
    const refs: unknown[] = [];
    const sparseNode: ResolvedOf<'Custom'> = { ...node, actions: {} };
    renderCustom(
      sparseNode,
      ctx({
        encodeActionId: (ref) => {
          refs.push(ref);
          return 'x';
        },
      }),
    );
    expect(refs[0]).toMatchObject({ kind: 'action', componentId: 'c' });
    expect((refs[0] as { action?: string }).action).toBeUndefined();
  });

  it('uses empty string path when node.inputs has no value for the param', () => {
    // node.inputs[paramName] is undefined at runtime (key absent) — exercises the
    // `?? ''` fallback branch on line 72 of render-custom.ts.
    const refs: unknown[] = [];
    const sparseNode: ResolvedOf<'Custom'> = { ...node, inputs: {} };
    renderCustom(
      sparseNode,
      ctx({
        encodeActionId: (ref) => {
          refs.push(ref);
          return 'x';
        },
      }),
    );
    expect(refs[1]).toMatchObject({ kind: 'input', componentId: 'c', path: '' });
  });
});
