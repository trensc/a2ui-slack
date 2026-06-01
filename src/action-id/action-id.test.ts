import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { ActionIdRef, ActionKind } from './action-id-ref.js';
import { decodeActionId, emptyRegistry, encodeActionId } from './action-id.js';

const refArb: fc.Arbitrary<ActionIdRef> = fc
  .record({
    kind: fc.constantFrom<ActionKind>('input', 'action'),
    surfaceId: fc.string(),
    componentId: fc.string(),
    maybePath: fc.option(fc.string(), { nil: undefined }),
  })
  .map(
    ({ maybePath, ...rest }): ActionIdRef =>
      maybePath === undefined ? rest : { ...rest, path: maybePath },
  );

describe('encodeActionId / decodeActionId', () => {
  it('round-trips any ref through its returned registry', () => {
    fc.assert(
      fc.property(refArb, (ref) => {
        const { id, registry } = encodeActionId(ref, emptyRegistry);
        expect(decodeActionId(id, registry)).toEqual({ ok: true, ref });
      }),
    );
  });

  it('returns the same token and grows the registry only once for an identical ref (dedup)', () => {
    fc.assert(
      fc.property(refArb, (ref) => {
        const first = encodeActionId(ref, emptyRegistry);
        const second = encodeActionId(ref, first.registry);
        expect(second.id).toBe(first.id);
        expect(second.registry.byToken.size).toBe(1);
      }),
    );
  });

  it('assigns sequential tokens to distinct refs', () => {
    const a: ActionIdRef = { kind: 'action', surfaceId: 's1', componentId: 'go' };
    const b: ActionIdRef = { kind: 'action', surfaceId: 's1', componentId: 'stop' };
    const first = encodeActionId(a, emptyRegistry);
    const second = encodeActionId(b, first.registry);
    expect(first.id).toBe('t|0');
    expect(second.id).toBe('t|1');
    expect(second.registry.byToken.size).toBe(2);
  });

  it('seeds the counter from the incoming registry size', () => {
    const seeded = encodeActionId(
      { kind: 'action', surfaceId: 's1', componentId: 'a' },
      emptyRegistry,
    ).registry;
    const next = encodeActionId(
      { kind: 'action', surfaceId: 's1', componentId: 'b' },
      seeded,
    );
    expect(next.id).toBe('t|1');
  });

  it('treats kind as part of identity (input vs action are distinct tokens)', () => {
    const input: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'x',
      path: '/v',
    };
    const action: ActionIdRef = { kind: 'action', surfaceId: 's1', componentId: 'x' };
    const first = encodeActionId(input, emptyRegistry);
    const second = encodeActionId(action, first.registry);
    expect(second.id).not.toBe(first.id);
  });

  it('treats path as part of identity (different paths are distinct tokens)', () => {
    const a: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'x',
      path: '/a',
    };
    const b: ActionIdRef = {
      kind: 'input',
      surfaceId: 's1',
      componentId: 'x',
      path: '/b',
    };
    const first = encodeActionId(a, emptyRegistry);
    const second = encodeActionId(b, first.registry);
    expect(second.id).not.toBe(first.id);
  });

  it('does not mutate the registry passed in', () => {
    encodeActionId({ kind: 'action', surfaceId: 's1', componentId: 'a' }, emptyRegistry);
    expect(emptyRegistry.byToken.size).toBe(0);
    expect(emptyRegistry.byKey.size).toBe(0);
  });

  it('fails (without throwing) when decoding an unknown token', () => {
    expect(decodeActionId('t|404', emptyRegistry)).toEqual({
      ok: false,
      reason: 'unknown token',
    });
  });
});
