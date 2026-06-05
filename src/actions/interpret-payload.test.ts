import { describe, expect, it } from 'vitest';
import { emptyRegistry, encodeActionId } from '../action-id/action-id.js';
import type { ActionIdRef } from '../action-id/action-id-ref.js';
import type { TokenRegistry } from '../action-id/action-id.js';
import { interpretPayload } from './interpret-payload.js';

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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
      {
        type: 'block_actions',
        actions: [{ type: 'plain_text_input', action_id: 'nope', value: 'x' }],
      },
      emptyRegistry,
    );
    expect(effects).toEqual([]);
  });

  it('skips an element with no action_id at all', () => {
    const effects = interpretPayload(
      { type: 'block_actions', actions: [{ type: 'plain_text_input', value: 'x' }] },
      emptyRegistry,
    );
    expect(effects).toEqual([]);
  });

  it('skips an input whose element type is unknown', () => {
    const t = tokens([inputRef]);
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
    const effects = interpretPayload(
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
