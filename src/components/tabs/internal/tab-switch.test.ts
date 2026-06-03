import { describe, expect, it } from 'vitest';
import type { ResolvedTab } from './tab-switch.js';
import { buildSwitchControl } from './tab-switch.js';

function tabs(count: number): ResolvedTab[] {
  return Array.from({ length: count }, (_, i) => ({
    title: `Tab ${String(i)}`,
    childId: `c${String(i)}`,
  }));
}

describe('buildSwitchControl', () => {
  it('renders a button row for ≤5 tabs with unique action_ids and the active style', () => {
    const { block, degradations } = buildSwitchControl(tabs(3), 1, 'a|t', 'tabs');
    expect(degradations).toEqual([]);
    expect(block.type).toBe('actions');
    expect(block.elements).toEqual([
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Tab 0' },
        value: '0',
        action_id: 'a|t#0',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Tab 1' },
        value: '1',
        action_id: 'a|t#1',
        style: 'primary',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Tab 2' },
        value: '2',
        action_id: 'a|t#2',
      },
    ]);
  });

  it('stays a button row at exactly 5 tabs (overflow only kicks in above 5)', () => {
    const { block, degradations } = buildSwitchControl(tabs(5), 0, 'a|t', 'tabs');
    expect(degradations).toEqual([]);
    expect(block.elements).toHaveLength(5);
    expect(block.elements.every((el) => el.type === 'button')).toBe(true);
    const ids = block.elements.map((el) => (el.type === 'button' ? el.action_id : ''));
    expect(new Set(ids).size).toBe(5);
  });

  it('switches to an overflow menu above 5 tabs, capped at 5 options + a report', () => {
    const { block, degradations } = buildSwitchControl(tabs(7), 0, 'a|t', 'tabs');
    const [element] = block.elements;
    if (element === undefined || element.type !== 'overflow') {
      throw new Error('expected an overflow element');
    }
    expect(element.action_id).toBe('a|t');
    expect(element.options).toHaveLength(5);
    expect(element.options[0]).toEqual({
      text: { type: 'plain_text', text: 'Tab 0' },
      value: '0',
    });
    expect(degradations).toEqual([
      {
        componentId: 'tabs',
        componentType: 'Tabs',
        fidelity: 'partial',
        reason: 'overflow switch limited to 5 tabs',
      },
    ]);
  });

  it('clips long tab titles to 75 chars in both the button row and the overflow menu', () => {
    const long = 'y'.repeat(120);
    const buttonRow = buildSwitchControl(
      [{ title: long, childId: 'c' }],
      0,
      'a|t',
      'tabs',
    );
    const [button] = buttonRow.block.elements;
    if (button?.type !== 'button') throw new Error('expected a button');
    expect(button.text.text).toHaveLength(75);
    expect(button.text.text.endsWith('…')).toBe(true);

    const overflow = buildSwitchControl(
      Array.from({ length: 6 }, () => ({ title: long, childId: 'c' })),
      0,
      'a|t',
      'tabs',
    );
    const [element] = overflow.block.elements;
    if (element?.type !== 'overflow') throw new Error('expected an overflow element');
    expect(element.options[0]?.text.text).toHaveLength(75);
  });
});
