import type { JsonValue } from '../inbound-effect.js';

/** A selected option as Slack echoes it inside an interaction payload. */
export interface SlackSelectedOption {
  readonly value: string;
}

/**
 * The minimal shape of one interactive element as it appears in a Slack inbound
 * payload (`block_actions[*]` or `view.state.values[block][action]`). `@slack/types`
 * models outbound block definitions, not these inbound echoes, so we type only the
 * fields we read. Every field is optional — payloads vary by element type.
 */
export interface InboundElement {
  readonly type: string;
  readonly action_id?: string;
  readonly value?: string | null;
  readonly selected_option?: SlackSelectedOption | null;
  readonly selected_options?: readonly SlackSelectedOption[];
  readonly selected_date?: string | null;
  readonly selected_time?: string | null;
}

function optionValues(
  options: readonly SlackSelectedOption[] | undefined,
): readonly string[] {
  return (options ?? []).map((option) => option.value);
}

/**
 * One extractor per Slack element type. A lookup table (rather than a switch) keeps
 * each rule isolated and the dispatcher trivial. A cleared single-select / empty
 * date yields `null` — a real "unset" to write back.
 */
const EXTRACTORS: Readonly<Record<string, (element: InboundElement) => JsonValue>> = {
  plain_text_input: (el) => (typeof el.value === 'string' ? el.value : null),
  checkboxes: (el) => optionValues(el.selected_options),
  multi_static_select: (el) => optionValues(el.selected_options),
  radio_buttons: (el) => el.selected_option?.value ?? null,
  static_select: (el) => el.selected_option?.value ?? null,
  datepicker: (el) => el.selected_date ?? null,
  timepicker: (el) => el.selected_time ?? null,
  button: (el) => el.value ?? null,
  overflow: (el) => el.value ?? null,
};

/**
 * Pull the submitted value out of one Slack element, normalised to a `JsonValue`.
 * An unrecognised element type returns `undefined` so the caller skips it. Never
 * throws — inbound payloads are untrusted.
 */
export function extractValue(element: InboundElement): JsonValue | undefined {
  const extractor = EXTRACTORS[element.type];
  return extractor === undefined ? undefined : extractor(element);
}
