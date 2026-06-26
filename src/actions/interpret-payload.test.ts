import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { emptyRegistry, encodeActionId } from '../action-id/action-id.js';
import type { ActionIdRef } from '../action-id/action-id-ref.js';
import type { TokenRegistry } from '../action-id/action-id.js';
import { interpretPayload } from './interpret-payload.js';
import type { InboundResult } from './inbound-effect.js';
import { buildCustomRegistry } from '../components/custom/custom-component.js';

/** Encode refs into a registry; `id(i)` returns the i-th token id (always a string). */
function tokens(refs: ActionIdRef[]): {
  registry: TokenRegistry;
  id: (i: number) => string;
} {
  let registry = emptyRegistry;
  const ids: string[] = [];
  for (const ref of refs) {
    const result = encodeActionId(ref, registry);
    registry = result.registry;
    ids.push(result.id);
  }
  return { registry, id: (i) => ids[i] ?? '' };
}

const inputRef: ActionIdRef = {
  kind: 'input',
  surfaceId: 's1',
  componentId: 'name',
  path: '/user/name',
};
const actionRef: ActionIdRef = { kind: 'action', surfaceId: 's1', componentId: 'submit' };

describe('interpretPayload — block_actions', () => {
  it('maps an input element to a setData with the decoded surface + path', () => {
    const t = tokens([inputRef]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: t.id(0), value: 'Ada' }],
      },
      t.registry,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's1', path: '/user/name', value: 'Ada' },
    ]);
  });

  it('maps an action element to a fireAction', () => {
    const t = tokens([actionRef]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'button', action_id: t.id(0), value: '0' }],
      },
      t.registry,
    );
    expect(effects).toEqual([
      { kind: 'fireAction', surfaceId: 's1', componentId: 'submit' },
    ]);
  });

  it('emits every setData before any fireAction regardless of input order', () => {
    const t = tokens([actionRef, inputRef]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [
          { type: 'button', action_id: t.id(0), value: '0' },
          { type: 'plain_text_input', action_id: t.id(1), value: 'Ada' },
        ],
      },
      t.registry,
    );
    expect(effects.map((e) => e.kind)).toEqual(['setData', 'fireAction']);
  });

  it('skips an element whose action_id does not decode', () => {
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: 'nope', value: 'x' }],
      },
      emptyRegistry,
    );
    expect(effects).toEqual([]);
  });

  it('skips an element with no action_id at all', () => {
    const { effects } = interpretPayload(
      { type: 'block_actions', actions: [{ type: 'plain_text_input', value: 'x' }] },
      emptyRegistry,
    );
    expect(effects).toEqual([]);
  });

  it('skips an input whose element type is unknown', () => {
    const t = tokens([inputRef]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'rich_text_input', action_id: t.id(0) }],
      },
      t.registry,
    );
    expect(effects).toEqual([]);
  });

  it('skips an input ref that carries no path', () => {
    const t = tokens([{ kind: 'input', surfaceId: 's1', componentId: 'c' }]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: t.id(0), value: 'x' }],
      },
      t.registry,
    );
    expect(effects).toEqual([]);
  });

  it('round-trips a path with special chars from the encoder', () => {
    const ref: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'c',
      path: '/items/0/name~weird|x',
    };
    const t = tokens([ref]);
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [
          { type: 'static_select', action_id: t.id(0), selected_option: { value: 'v' } },
        ],
      },
      t.registry,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's1', path: '/items/0/name~weird|x', value: 'v' },
    ]);
  });

  it('returns a structured result: effects plus an (empty) diagnostics channel', () => {
    const t = tokens([inputRef]);
    const result = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: t.id(0), value: 'Ada' }],
      },
      t.registry,
    );
    expect(result.effects).toEqual([
      { kind: 'setData', surfaceId: 's1', path: '/user/name', value: 'Ada' },
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});

describe('custom-aware inbound', () => {
  it('copies the action value onto the fireAction effect', () => {
    const enc = encodeActionId(
      { kind: 'action', surfaceId: 's', componentId: 'c', action: 'approve' },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      { type: 'block_actions', actions: [{ type: 'button', action_id: enc.id }] },
      enc.registry,
    );
    expect(effects).toEqual([
      { kind: 'fireAction', surfaceId: 's', componentId: 'c', action: 'approve' },
    ]);
  });

  it('uses the per-param custom extractor for setData', () => {
    const custom = buildCustomRegistry([
      {
        name: 'RangePicker',
        schema: z.object({ range: z.unknown() }),
        inputs: { range: { extract: (el) => (el.value ?? '').split('-') } },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/r',
        custom: { component: 'RangePicker', param: 'range' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'custom_range', action_id: enc.id, value: '1-9' }],
      },
      enc.registry,
      custom,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/r', value: ['1', '9'] },
    ]);
  });

  it('skips setData when the input ref has an empty path (no {path} binding)', () => {
    const enc = encodeActionId(
      { kind: 'input', surfaceId: 's', componentId: 'c', path: '' },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'x' }],
      },
      enc.registry,
    );
    expect(effects).toEqual([]); // empty pointer → no write-back, never writes the model root
  });

  it('skips setData when the input ref has no path at all (covers the `=== undefined` disjunct)', () => {
    const enc = encodeActionId(
      { kind: 'input', surfaceId: 's', componentId: 'c' }, // path omitted
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'x' }],
      },
      enc.registry,
    );
    expect(effects).toEqual([]);
  });

  it('honors a custom extractor that returns null (cleared)', () => {
    const custom = buildCustomRegistry([
      {
        name: 'Clearable',
        schema: z.object({ val: z.unknown() }),
        inputs: { val: { extract: () => null } },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/v',
        custom: { component: 'Clearable', param: 'val' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'x', action_id: enc.id, value: 'anything' }],
      },
      enc.registry,
      custom,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/v', value: null },
    ]);
  });

  it('defers to the built-in extractor when a custom extractor returns undefined', () => {
    const custom = buildCustomRegistry([
      {
        name: 'Deferring',
        schema: z.object({ val: z.unknown() }),
        // Returns undefined for this element → fall through to the built-in extractor.
        inputs: { val: { extract: () => undefined } },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/v',
        custom: { component: 'Deferring', param: 'val' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [
          { type: 'plain_text_input', action_id: enc.id, value: 'built-in wins' },
        ],
      },
      enc.registry,
      custom,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/v', value: 'built-in wins' },
    ]);
  });

  it('defers to the built-in extractor when a custom extractor throws (never propagates)', () => {
    const custom = buildCustomRegistry([
      {
        name: 'Throwing',
        schema: z.object({ val: z.unknown() }),
        // Integrator bug: e.g. reads a field off an undefined value.
        inputs: {
          val: {
            extract: () => {
              throw new Error('boom');
            },
          },
        },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/v',
        custom: { component: 'Throwing', param: 'val' },
      },
      emptyRegistry,
    );
    const run = (): InboundResult =>
      interpretPayload(
        {
          type: 'block_actions',
          actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'survives' }],
        },
        enc.registry,
        custom,
      );
    expect(run).not.toThrow();
    expect(run().effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/v', value: 'survives' },
    ]);
    expect(run().diagnostics).toHaveLength(1);
    const [diag] = run().diagnostics;
    expect(diag).toMatchObject({
      kind: 'extractorThrew',
      surfaceId: 's',
      componentId: 'c',
      path: '/v',
      custom: { component: 'Throwing', param: 'val' },
    });
    expect(diag?.reason).toContain('boom');
  });

  it('falls back to built-in extractor when ref has custom marker but no custom registry provided', () => {
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/value',
        custom: { component: 'Custom', param: 'data' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'fallback' }],
      },
      enc.registry,
      // no custom registry provided (undefined)
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/value', value: 'fallback' },
    ]);
  });

  it('falls back to built-in extractor when custom component is not in the registry', () => {
    const custom = buildCustomRegistry([
      {
        name: 'Registered',
        schema: z.object({ field: z.unknown() }),
        inputs: { field: { extract: () => 'custom-value' } },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/value',
        custom: { component: 'NotRegistered', param: 'field' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'builtin' }],
      },
      enc.registry,
      custom,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/value', value: 'builtin' },
    ]);
  });

  it('emits an extractorThrew diagnostic without a path field when the ref carries no path', () => {
    const custom = buildCustomRegistry([
      {
        name: 'PathlessThrower',
        schema: z.object({ val: z.unknown() }),
        inputs: {
          val: {
            extract: () => {
              throw new Error('no-path-boom');
            },
          },
        },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      // No path in the ref — covers the `ref.path === undefined` branch in the
      // conditional spread inside `customExtract`.
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        custom: { component: 'PathlessThrower', param: 'val' },
      },
      emptyRegistry,
    );
    const result = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'rich_text_input', action_id: enc.id }],
      },
      enc.registry,
      custom,
    );
    expect(result.effects).toEqual([]);
    expect(result.diagnostics).toHaveLength(1);
    const [diag] = result.diagnostics;
    expect(diag).toMatchObject({
      kind: 'extractorThrew',
      surfaceId: 's',
      componentId: 'c',
      custom: { component: 'PathlessThrower', param: 'val' },
    });
    // No `path` field on the diagnostic when ref.path is undefined.
    expect(diag).not.toHaveProperty('path');
    expect(diag?.reason).toContain('no-path-boom');
  });

  it('emits an extractorThrew diagnostic when a custom extractor throws on a non-standard element (write is lost)', () => {
    const custom = buildCustomRegistry([
      {
        name: 'Widget',
        schema: z.object({ val: z.object({ path: z.string() }) }),
        inputs: {
          val: {
            extract: () => {
              throw new Error('boom');
            },
          },
        },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/v',
        custom: { component: 'Widget', param: 'val' },
      },
      emptyRegistry,
    );
    const result = interpretPayload(
      {
        type: 'block_actions',
        // 'rich_text_input' is absent from EXTRACTORS → built-in fallback yields undefined.
        actions: [{ type: 'rich_text_input', action_id: enc.id }],
      },
      enc.registry,
      custom,
    );
    // The write is lost (no built-in can extract it)…
    expect(result.effects).toEqual([]);
    // …but it is no longer silent.
    expect(result.diagnostics).toHaveLength(1);
    const [diag] = result.diagnostics;
    expect(diag).toMatchObject({
      kind: 'extractorThrew',
      surfaceId: 's',
      componentId: 'c',
      path: '/v',
      custom: { component: 'Widget', param: 'val' },
    });
    expect(diag?.reason).toContain('boom');
  });

  it('falls back to built-in extractor when custom component has no inputs for the param', () => {
    const custom = buildCustomRegistry([
      {
        name: 'PartialInputs',
        schema: z.object({ other: z.unknown() }),
        inputs: { other: { extract: () => 'other-value' } },
        render: () => [],
      },
    ]);
    const enc = encodeActionId(
      {
        kind: 'input',
        surfaceId: 's',
        componentId: 'c',
        path: '/value',
        custom: { component: 'PartialInputs', param: 'missing' },
      },
      emptyRegistry,
    );
    const { effects } = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: enc.id, value: 'fallback2' }],
      },
      enc.registry,
      custom,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's', path: '/value', value: 'fallback2' },
    ]);
  });
});

describe('interpretPayload — view_submission', () => {
  it('emits setData for every input keyed by its block + action_id', () => {
    const nameRef: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'n',
      path: '/name',
    };
    const ageRef: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'a',
      path: '/age',
    };
    const t = tokens([nameRef, ageRef]);
    const { effects } = interpretPayload(
      {
        type: 'view_submission',
        view: {
          state: {
            values: {
              b1: { [t.id(0)]: { type: 'plain_text_input', value: 'Ada' } },
              b2: { [t.id(1)]: { type: 'plain_text_input', value: '36' } },
            },
          },
        },
      },
      t.registry,
    );
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 's1', path: '/name', value: 'Ada' },
      { kind: 'setData', surfaceId: 's1', path: '/age', value: '36' },
    ]);
  });

  it('skips undecodable entries in a view submission', () => {
    const { effects } = interpretPayload(
      {
        type: 'view_submission',
        view: {
          state: { values: { b1: { bad: { type: 'plain_text_input', value: 'x' } } } },
        },
      },
      emptyRegistry,
    );
    expect(effects).toEqual([]);
  });
});
