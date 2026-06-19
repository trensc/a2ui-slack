import type { RenderContext, RenderResult } from './render-context.js';
import type { ResolvedComponent } from './resolved-component.js';
import { fallbackResult } from './fallback.js';
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
// eslint-disable-next-line complexity -- exhaustive 19-way dispatch; the never default guarantees completeness at compile time.
export function renderComponent(
  node: ResolvedComponent,
  context: RenderContext,
): RenderResult {
  switch (node.type) {
    case 'Text':
      return renderText(node, context);
    case 'Image':
      return renderImage(node, context);
    case 'Icon':
      return renderIcon(node, context);
    case 'Video':
      return renderVideo(node, context);
    case 'AudioPlayer':
      return renderAudioPlayer(node, context);
    case 'Row':
      return renderRow(node, context);
    case 'Column':
      return renderColumn(node, context);
    case 'List':
      return renderList(node, context);
    case 'Card':
      return renderCard(node, context);
    case 'Tabs':
      return renderTabs(node, context);
    case 'Modal':
      return renderModal(node, context);
    case 'Divider':
      return renderDivider(node, context);
    case 'Button':
      return renderButton(node, context);
    case 'TextField':
      return renderTextField(node, context);
    case 'CheckBox':
      return renderCheckBox(node, context);
    case 'ChoicePicker':
      return renderChoicePicker(node, context);
    case 'Slider':
      return renderSlider(node, context);
    case 'DateTimeInput':
      return renderDateTimeInput(node, context);
    case 'Custom':
      // Placeholder — Task 4 swaps this for `renderCustom(node, context)`.
      return fallbackResult(node, 'custom component rendering not yet wired');
    /* v8 ignore start -- unreachable: the never assignment makes a missing case a compile error. */
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
    /* v8 ignore stop */
  }
}
