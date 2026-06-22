import { describe, expect, it } from 'vitest';
import type { ComponentType, ResolvedComponent } from './resolved-component.js';
import type { ComponentRenderer, RenderContext } from './render-context.js';
import { renderComponent } from './render-component.js';
import { renderCustom } from './custom/render-custom.js';
import { renderText } from './text/text.js';
import { renderImage } from './image/image.js';
import { renderIcon } from './icon/icon.js';
import { renderVideo } from './video/video.js';
import { renderAudioPlayer } from './audio-player/audio-player.js';
import { renderRow } from './row/row.js';
import { renderColumn } from './column/column.js';
import { renderList } from './list/list.js';
import { renderCard } from './card/card.js';
import { renderTabs } from './tabs/tabs.js';
import { renderModal } from './modal/modal.js';
import { renderDivider } from './divider/divider.js';
import { renderButton } from './button/button.js';
import { renderTextField } from './text-field/text-field.js';
import { renderCheckBox } from './check-box/check-box.js';
import { renderChoicePicker } from './choice-picker/choice-picker.js';
import { renderSlider } from './slider/slider.js';
import { renderDateTimeInput } from './date-time-input/date-time-input.js';

const context: RenderContext = {
  renderChild: () => ({ blocks: [], degradations: [] }),
  encodeActionId: (ref) => `enc|${ref.kind}|${ref.componentId}|${ref.path ?? ''}`,
  surfaceKind: 'message',
  customComponents: new Map(),
};

// One sample per type, plus the concrete renderer the dispatch MUST route it to.
// Typed as { [T in ComponentType]: … } so omitting a type is a compile error,
// mirroring the never guard in the dispatch itself.
type Case<T extends ComponentType> = {
  readonly node: Extract<ResolvedComponent, { type: T }>;
  readonly renderer: ComponentRenderer<T>;
};
const cases: { [T in ComponentType]: Case<T> } = {
  Text: { node: { type: 'Text', id: 'id', text: 'x' }, renderer: renderText },
  Image: {
    node: { type: 'Image', id: 'id', url: 'u', altText: 'a' },
    renderer: renderImage,
  },
  Icon: { node: { type: 'Icon', id: 'id', name: 'check' }, renderer: renderIcon },
  Video: { node: { type: 'Video', id: 'id', url: 'u' }, renderer: renderVideo },
  AudioPlayer: {
    node: { type: 'AudioPlayer', id: 'id', url: 'u' },
    renderer: renderAudioPlayer,
  },
  Row: { node: { type: 'Row', id: 'id', childrenIds: ['a', 'b'] }, renderer: renderRow },
  Column: {
    node: { type: 'Column', id: 'id', childrenIds: ['a'] },
    renderer: renderColumn,
  },
  List: { node: { type: 'List', id: 'id', childrenIds: ['a'] }, renderer: renderList },
  Card: { node: { type: 'Card', id: 'id', childId: 'c' }, renderer: renderCard },
  Tabs: {
    node: {
      type: 'Tabs',
      id: 'id',
      tabs: [{ title: 't', childId: 'c' }],
      activeIndex: 0,
    },
    renderer: renderTabs,
  },
  Modal: {
    node: { type: 'Modal', id: 'id', triggerId: 't', contentId: 'c' },
    renderer: renderModal,
  },
  Divider: { node: { type: 'Divider', id: 'id' }, renderer: renderDivider },
  Button: {
    node: {
      type: 'Button',
      id: 'id',
      label: 'l',
      disabled: false,
      hasServerAction: true,
    },
    renderer: renderButton,
  },
  TextField: {
    node: {
      type: 'TextField',
      id: 'id',
      label: 'l',
      value: 'v',
      path: '/p',
      multiline: false,
      disabled: false,
    },
    renderer: renderTextField,
  },
  CheckBox: {
    node: { type: 'CheckBox', id: 'id', label: 'l', checked: false, path: '/p' },
    renderer: renderCheckBox,
  },
  ChoicePicker: {
    node: {
      type: 'ChoicePicker',
      id: 'id',
      options: [{ label: 'o', value: 'o' }],
      selected: [],
      multiple: false,
      path: '/p',
    },
    renderer: renderChoicePicker,
  },
  Slider: {
    node: { type: 'Slider', id: 'id', min: 0, max: 10, value: 5, path: '/p' },
    renderer: renderSlider,
  },
  DateTimeInput: {
    node: { type: 'DateTimeInput', id: 'id', path: '/p', mode: 'date' },
    renderer: renderDateTimeInput,
  },
  Custom: {
    node: {
      type: 'Custom',
      id: 'id',
      name: 'MyCard',
      props: {},
      actions: {},
      inputs: {},
    },
    renderer: renderCustom,
  },
};

describe('renderComponent', () => {
  const entries = Object.values(cases) as ReadonlyArray<Case<ComponentType>>;

  it.each(entries.map((c) => [c.node.type, c] as const))(
    'routes %s to its own renderer (output identical to calling it directly)',
    (_label, c) => {
      // If the switch routed to the wrong renderer, the deep-equal would diverge.
      expect(renderComponent(c.node, context)).toEqual(c.renderer(c.node, context));
    },
  );

  it('handles all 19 component types', () => {
    expect(entries).toHaveLength(19);
  });
});
