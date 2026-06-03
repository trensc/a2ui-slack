import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { ActionIdRef } from '../../action-id/action-id-ref.js';
import {
  decodeActionId,
  emptyRegistry,
  encodeActionId,
} from '../../action-id/action-id.js';
import type { RenderContext } from '../render-context.js';
import type { ResolvedOf } from '../resolved-component.js';
import { renderDateTimeInput } from './date-time-input.js';

/** Narrow an actions block holding a date + time picker to their action_ids. */
function pickerActionIds(blocks: readonly KnownBlock[]): {
  dateId: string;
  timeId: string;
} {
  const [block] = blocks;
  if (
    block?.type !== 'actions' ||
    block.elements[0]?.type !== 'datepicker' ||
    block.elements[1]?.type !== 'timepicker'
  ) {
    throw new Error('expected date + time pickers');
  }
  return {
    dateId: block.elements[0].action_id ?? '',
    timeId: block.elements[1].action_id ?? '',
  };
}

function context(surfaceKind: RenderContext['surfaceKind']): RenderContext {
  return {
    renderChild: () => ({ blocks: [], degradations: [] }),
    encodeActionId: (ref) => `id|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
    surfaceKind,
  };
}

function node(
  overrides: Partial<ResolvedOf<'DateTimeInput'>> = {},
): ResolvedOf<'DateTimeInput'> {
  return { type: 'DateTimeInput', id: 'dt1', path: '/when', mode: 'date', ...overrides };
}

describe('renderDateTimeInput', () => {
  it('date mode in a message → a datepicker in an actions block, full fidelity', () => {
    const { blocks, degradations } = renderDateTimeInput(
      node({ value: '2026-06-05' }),
      context('message'),
    );
    expect(degradations).toEqual([]);
    expect(blocks).toEqual([
      {
        type: 'actions',
        block_id: 'id|input|dt1|/when',
        elements: [
          {
            type: 'datepicker',
            action_id: 'id|input|dt1|/when',
            initial_date: '2026-06-05',
          },
        ],
      },
    ]);
  });

  it('date mode omits initial_date when there is no value', () => {
    const { blocks } = renderDateTimeInput(node(), context('message'));
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'datepicker') {
      throw new Error('expected datepicker');
    }
    expect(block.elements[0].initial_date).toBeUndefined();
  });

  it('date mode ignores a value with no date portion', () => {
    const { blocks } = renderDateTimeInput(
      node({ value: 'garbage' }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'datepicker') {
      throw new Error('expected datepicker');
    }
    expect(block.elements[0].initial_date).toBeUndefined();
  });

  it('time mode → a timepicker, full fidelity', () => {
    const { blocks, degradations } = renderDateTimeInput(
      node({ mode: 'time', value: '14:30' }),
      context('message'),
    );
    expect(degradations).toEqual([]);
    const [block] = blocks;
    if (block?.type !== 'actions' || block.elements[0]?.type !== 'timepicker') {
      throw new Error('expected timepicker');
    }
    expect(block.elements[0].initial_time).toBe('14:30');
  });

  it('datetime mode → date + time pickers with a partial split report', () => {
    const { blocks, degradations } = renderDateTimeInput(
      node({ mode: 'datetime', value: '2026-06-05T14:30' }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions') throw new Error('expected actions');
    expect(block.elements).toHaveLength(2);
    expect(block.elements[0]).toEqual({
      type: 'datepicker',
      action_id: 'id|input|dt1|/when',
      initial_date: '2026-06-05',
    });
    expect(block.elements[1]).toEqual({
      type: 'timepicker',
      action_id: 'id|input|dt1#time|/when',
      initial_time: '14:30',
    });
    expect(degradations).toHaveLength(1);
    expect(degradations[0]).toMatchObject({
      componentId: 'dt1',
      componentType: 'DateTimeInput',
      fidelity: 'partial',
    });
    expect(degradations[0]?.reason).toContain('split');
  });

  it('datetime mode tolerates a date-only value (no time portion)', () => {
    const { blocks } = renderDateTimeInput(
      node({ mode: 'datetime', value: '2026-06-05' }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions') throw new Error('expected actions');
    if (block.elements[0]?.type !== 'datepicker') throw new Error('expected datepicker');
    if (block.elements[1]?.type !== 'timepicker') throw new Error('expected timepicker');
    expect(block.elements[0].initial_date).toBe('2026-06-05');
    expect(block.elements[1].initial_time).toBeUndefined();
  });

  it('datetime mode with no value omits both initials', () => {
    const { blocks } = renderDateTimeInput(
      node({ mode: 'datetime' }),
      context('message'),
    );
    const [block] = blocks;
    if (block?.type !== 'actions') throw new Error('expected actions');
    if (block.elements[0]?.type !== 'datepicker') throw new Error('expected datepicker');
    if (block.elements[1]?.type !== 'timepicker') throw new Error('expected timepicker');
    expect(block.elements[0].initial_date).toBeUndefined();
    expect(block.elements[1].initial_time).toBeUndefined();
  });

  it('date mode in a modal → a single input block', () => {
    const { blocks } = renderDateTimeInput(
      node({ value: '2026-06-05' }),
      context('modal'),
    );
    expect(blocks).toHaveLength(1);
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.element.type).toBe('datepicker');
  });

  it('time mode in a home view → a single input block', () => {
    const { blocks } = renderDateTimeInput(node({ mode: 'time' }), context('home'));
    const [block] = blocks;
    if (block?.type !== 'input') throw new Error('expected input block');
    expect(block.element.type).toBe('timepicker');
  });

  it('datetime mode in a modal → two input blocks with a partial report', () => {
    const { blocks, degradations } = renderDateTimeInput(
      node({ mode: 'datetime', value: '2026-06-05T09:15' }),
      context('modal'),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe('input');
    expect(blocks[1]?.type).toBe('input');
    const [first, second] = blocks;
    if (first?.type !== 'input' || second?.type !== 'input') {
      throw new Error('expected input blocks');
    }
    expect(first.element.type).toBe('datepicker');
    expect(second.element.type).toBe('timepicker');
    expect(degradations).toHaveLength(1);
    expect(degradations[0]?.fidelity).toBe('partial');
  });

  it('round-trips the date picker path through the real codec', () => {
    const path = '/events/0/at~1z|q';
    let registry = emptyRegistry;
    const ctx: RenderContext = {
      renderChild: () => ({ blocks: [], degradations: [] }),
      encodeActionId: (ref) => {
        const full: ActionIdRef = { ...ref, surfaceId: 's1' };
        const result = encodeActionId(full, registry);
        registry = result.registry;
        return result.id;
      },
      surfaceKind: 'message',
    };
    const { blocks } = renderDateTimeInput(
      node({ mode: 'datetime', value: '2026-06-05T14:30', path }),
      ctx,
    );
    const { dateId, timeId } = pickerActionIds(blocks);
    const date = decodeActionId(dateId, registry);
    const time = decodeActionId(timeId, registry);
    expect(date.ok && time.ok).toBe(true);
    if (!date.ok || !time.ok) throw new Error('decode failed');
    expect(date.ref.path).toBe(path);
    expect(date.ref.componentId).toBe('dt1');
    expect(time.ref.path).toBe(path);
    expect(dateId).not.toBe(timeId);
  });
});
