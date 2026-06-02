import { describe, expect, it } from 'vitest';
import type { ComponentType, ResolvedComponent } from './resolved-component.js';
import type { RenderContext } from './render-context.js';
import { renderComponent } from './render-component.js';

const ctx: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: () => 't|0',
  surfaceKind: 'message',
};

// Typed as Record<ComponentType, …> so forgetting a type is a compile error here,
// mirroring the never guard in the dispatch itself.
const samples: Record<ComponentType, ResolvedComponent> = {
  Text: { type: 'Text', id: 'id', text: 'x' },
  Image: { type: 'Image', id: 'id', url: 'u', altText: 'a' },
  Icon: { type: 'Icon', id: 'id', name: 'n' },
  Video: { type: 'Video', id: 'id', url: 'u' },
  AudioPlayer: { type: 'AudioPlayer', id: 'id', url: 'u' },
  Row: { type: 'Row', id: 'id', childrenIds: [] },
  Column: { type: 'Column', id: 'id', childrenIds: [] },
  List: { type: 'List', id: 'id', childrenIds: [] },
  Card: { type: 'Card', id: 'id', childId: 'c' },
  Tabs: { type: 'Tabs', id: 'id', tabs: [], activeIndex: 0 },
  Modal: { type: 'Modal', id: 'id', triggerId: 't', contentId: 'c' },
  Divider: { type: 'Divider', id: 'id' },
  Button: {
    type: 'Button',
    id: 'id',
    label: 'l',
    disabled: false,
    hasServerAction: false,
  },
  TextField: {
    type: 'TextField',
    id: 'id',
    label: 'l',
    value: 'v',
    path: '/p',
    multiline: false,
    disabled: false,
  },
  CheckBox: { type: 'CheckBox', id: 'id', label: 'l', checked: false, path: '/p' },
  ChoicePicker: {
    type: 'ChoicePicker',
    id: 'id',
    options: [],
    selected: [],
    multiple: false,
    path: '/p',
  },
  Slider: { type: 'Slider', id: 'id', min: 0, max: 10, value: 5, path: '/p' },
  DateTimeInput: { type: 'DateTimeInput', id: 'id', path: '/p', mode: 'date' },
};

describe('renderComponent', () => {
  it.each(Object.values(samples).map((node) => [node.type, node] as const))(
    'dispatches %s to its renderer and returns a typed result',
    (_label, node) => {
      const result = renderComponent(node, ctx);
      expect(result.blocks).toHaveLength(1);
      expect(result.degradations[0]?.componentType).toBe(node.type);
    },
  );

  it('covers every component type', () => {
    expect(Object.keys(samples)).toHaveLength(18);
  });
});
