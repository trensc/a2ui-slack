import type { RenderContext, RenderResult } from './render-context.js';
import type { ResolvedComponent } from './resolved-component.js';
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

/**
 * The single exhaustive dispatch: maps a resolved component to its renderer.
 * The `never` default makes adding a `ComponentType` without a case a compile
 * error, so this file is the one place the component set is enforced — and the
 * one file no component task edits (no merge conflicts on the fan-out).
 */
// eslint-disable-next-line complexity -- exhaustive 18-way dispatch; the never default guarantees completeness at compile time.
export function renderComponent(
  node: ResolvedComponent,
  ctx: RenderContext,
): RenderResult {
  switch (node.type) {
    case 'Text':
      return renderText(node, ctx);
    case 'Image':
      return renderImage(node, ctx);
    case 'Icon':
      return renderIcon(node, ctx);
    case 'Video':
      return renderVideo(node, ctx);
    case 'AudioPlayer':
      return renderAudioPlayer(node, ctx);
    case 'Row':
      return renderRow(node, ctx);
    case 'Column':
      return renderColumn(node, ctx);
    case 'List':
      return renderList(node, ctx);
    case 'Card':
      return renderCard(node, ctx);
    case 'Tabs':
      return renderTabs(node, ctx);
    case 'Modal':
      return renderModal(node, ctx);
    case 'Divider':
      return renderDivider(node, ctx);
    case 'Button':
      return renderButton(node, ctx);
    case 'TextField':
      return renderTextField(node, ctx);
    case 'CheckBox':
      return renderCheckBox(node, ctx);
    case 'ChoicePicker':
      return renderChoicePicker(node, ctx);
    case 'Slider':
      return renderSlider(node, ctx);
    case 'DateTimeInput':
      return renderDateTimeInput(node, ctx);
    /* v8 ignore start -- unreachable: the never assignment makes a missing case a compile error. */
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
    /* v8 ignore stop */
  }
}
