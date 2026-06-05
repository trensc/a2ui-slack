import { describe, expect, it } from 'vitest';
import type { ActionsBlock, KnownBlock } from '@slack/types';
import type { RenderContext, RenderResult } from '../render-context.js';
import { renderTabs } from './tabs.js';

const section = (text: string): KnownBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

function contextFrom(map: Record<string, RenderResult>): RenderContext {
  return {
    renderChild: (id) =>
      map[id] ?? {
        blocks: [section(`\`${id}\` not supported`)],
        degradations: [
          {
            componentId: id,
            componentType: 'Text',
            fidelity: 'dropped',
            reason: 'missing',
          },
        ],
      },
    encodeActionId: (ref) => `a|${ref.componentId}`,
    surfaceKind: 'message',
  };
}

const tab = (title: string, childId: string) => ({ title, childId });

function actionsBlock(result: RenderResult): ActionsBlock {
  const block = result.blocks[0];
  if (block?.type !== 'actions') throw new Error('expected an actions switch block');
  return block;
}

describe('renderTabs', () => {
  it('renders the active tab with a button switch and partial report', () => {
    const context = contextFrom({ c0: { blocks: [section('zero')], degradations: [] } });
    const result = renderTabs(
      {
        type: 'Tabs',
        id: 'tabs',
        tabs: [tab('One', 'c0'), tab('Two', 'c1')],
        activeIndex: 0,
      },
      context,
    );
    const block = actionsBlock(result);
    expect(block.elements).toHaveLength(2);
    expect(result.blocks[1]).toEqual(section('zero'));
    expect(result.degradations).toEqual([
      {
        componentId: 'tabs',
        componentType: 'Tabs',
        fidelity: 'partial',
        reason: 'tabs emulated via switch + re-render',
      },
    ]);
  });

  it('marks only the active tab button primary and gives each a unique action_id', () => {
    const context = contextFrom({ c1: { blocks: [section('one')], degradations: [] } });
    const result = renderTabs(
      {
        type: 'Tabs',
        id: 'tabs',
        tabs: [tab('A', 'c0'), tab('B', 'c1')],
        activeIndex: 1,
      },
      context,
    );
    const block = actionsBlock(result);
    const [b0, b1] = block.elements;
    if (b0?.type !== 'button' || b1?.type !== 'button')
      throw new Error('expected buttons');
    expect(b0.style).toBeUndefined();
    expect(b1.style).toBe('primary');
    expect(b0.action_id).toBe('a|tabs#0');
    expect(b1.action_id).toBe('a|tabs#1');
    expect(b0.value).toBe('0');
    expect(b1.value).toBe('1');
    expect(result.blocks[1]).toEqual(section('one'));
  });

  it('clamps an activeIndex above range to the last tab and reports it', () => {
    const context = contextFrom({ c1: { blocks: [section('last')], degradations: [] } });
    const result = renderTabs(
      {
        type: 'Tabs',
        id: 'tabs',
        tabs: [tab('A', 'c0'), tab('B', 'c1')],
        activeIndex: 9,
      },
      context,
    );
    expect(result.blocks[1]).toEqual(section('last'));
    expect(result.degradations).toContainEqual({
      componentId: 'tabs',
      componentType: 'Tabs',
      fidelity: 'partial',
      reason: 'activeIndex out of range, clamped',
    });
  });

  it('clamps a negative activeIndex to the first tab and reports it', () => {
    const context = contextFrom({ c0: { blocks: [section('first')], degradations: [] } });
    const result = renderTabs(
      {
        type: 'Tabs',
        id: 'tabs',
        tabs: [tab('A', 'c0'), tab('B', 'c1')],
        activeIndex: -3,
      },
      context,
    );
    expect(result.blocks[1]).toEqual(section('first'));
    expect(result.degradations).toContainEqual({
      componentId: 'tabs',
      componentType: 'Tabs',
      fidelity: 'partial',
      reason: 'activeIndex out of range, clamped',
    });
  });

  it('renders only the emulation report for an empty tab set', () => {
    const result = renderTabs(
      { type: 'Tabs', id: 'tabs', tabs: [], activeIndex: 0 },
      contextFrom({}),
    );
    expect(result.blocks).toEqual([]);
    expect(result.degradations).toEqual([
      {
        componentId: 'tabs',
        componentType: 'Tabs',
        fidelity: 'partial',
        reason: 'tabs emulated via switch + re-render',
      },
    ]);
  });

  it('clips long tab titles to the 75-char button limit', () => {
    const long = 'T'.repeat(120);
    const context = contextFrom({ c0: { blocks: [section('x')], degradations: [] } });
    const result = renderTabs(
      {
        type: 'Tabs',
        id: 'tabs',
        tabs: [tab(long, 'c0'), tab('B', 'c1')],
        activeIndex: 0,
      },
      context,
    );
    const block = actionsBlock(result);
    const b0 = block.elements[0];
    if (b0?.type !== 'button') throw new Error('expected button');
    expect(b0.text.text.length).toBe(75);
  });

  it('uses an overflow menu when there are more than 5 tabs and reports the 5-option cap', () => {
    const tabs = Array.from({ length: 7 }, (_, i) =>
      tab(`T${String(i)}`, `c${String(i)}`),
    );
    const context = contextFrom({ c2: { blocks: [section('two')], degradations: [] } });
    const result = renderTabs(
      { type: 'Tabs', id: 'tabs', tabs, activeIndex: 2 },
      context,
    );
    const block = actionsBlock(result);
    const overflow = block.elements[0];
    if (overflow?.type !== 'overflow') throw new Error('expected overflow');
    expect(overflow.options).toHaveLength(5);
    expect(overflow.action_id).toBe('a|tabs');
    expect(result.blocks[1]).toEqual(section('two'));
    expect(result.degradations).toContainEqual({
      componentId: 'tabs',
      componentType: 'Tabs',
      fidelity: 'partial',
      reason: 'overflow switch limited to 5 tabs',
    });
  });

  it('uses an overflow menu without a cap report at exactly 6 tabs trimmed... but never over 5 options', () => {
    const tabs = Array.from({ length: 6 }, (_, i) =>
      tab(`T${String(i)}`, `c${String(i)}`),
    );
    const context = contextFrom({ c0: { blocks: [section('zero')], degradations: [] } });
    const result = renderTabs(
      { type: 'Tabs', id: 'tabs', tabs, activeIndex: 0 },
      context,
    );
    const block = actionsBlock(result);
    const overflow = block.elements[0];
    if (overflow?.type !== 'overflow') throw new Error('expected overflow');
    expect(overflow.options).toHaveLength(5);
    // 6 tabs > 5 options → still reports the cap.
    expect(result.degradations).toContainEqual({
      componentId: 'tabs',
      componentType: 'Tabs',
      fidelity: 'partial',
      reason: 'overflow switch limited to 5 tabs',
    });
  });

  it('propagates the active tab child degradations after the tab reports', () => {
    const context = contextFrom({
      c0: {
        blocks: [section('zero')],
        degradations: [
          {
            componentId: 'c0',
            componentType: 'Video',
            fidelity: 'partial',
            reason: 'no video',
          },
        ],
      },
    });
    const result = renderTabs(
      { type: 'Tabs', id: 'tabs', tabs: [tab('One', 'c0')], activeIndex: 0 },
      context,
    );
    expect(result.degradations).toEqual([
      {
        componentId: 'tabs',
        componentType: 'Tabs',
        fidelity: 'partial',
        reason: 'tabs emulated via switch + re-render',
      },
      {
        componentId: 'c0',
        componentType: 'Video',
        fidelity: 'partial',
        reason: 'no video',
      },
    ]);
  });

  it('propagates a missing active child fallback', () => {
    const result = renderTabs(
      { type: 'Tabs', id: 'tabs', tabs: [tab('One', 'ghost')], activeIndex: 0 },
      contextFrom({}),
    );
    expect(result.blocks[1]).toEqual(section('`ghost` not supported'));
    expect(result.degradations).toContainEqual({
      componentId: 'ghost',
      componentType: 'Text',
      fidelity: 'dropped',
      reason: 'missing',
    });
  });
});
