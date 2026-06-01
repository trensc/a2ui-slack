/**
 * A component AFTER binding resolution: every `DynamicString` / `{path}` /
 * `{call}` and every `checks` array has already been evaluated by the surface
 * layer (which wraps `@a2ui/web_core`'s binder). Renderers receive plain
 * primitives — they never resolve bindings or call functions themselves, which
 * keeps `src/components/` pure and deterministic.
 *
 * `childrenIds` are concrete component ids: `List` templates are expanded
 * upstream, so a renderer only ever sees a flat, resolved id list.
 *
 * Input components keep BOTH the resolved `value` (to render current state) and
 * the `path` (so the renderer can encode it into the `action_id` for write-back).
 */
export type ComponentType =
  | 'Text'
  | 'Image'
  | 'Icon'
  | 'Video'
  | 'AudioPlayer'
  | 'Row'
  | 'Column'
  | 'List'
  | 'Card'
  | 'Tabs'
  | 'Modal'
  | 'Divider'
  | 'Button'
  | 'TextField'
  | 'CheckBox'
  | 'ChoicePicker'
  | 'Slider'
  | 'DateTimeInput';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';

export interface ChoiceOption {
  readonly label: string;
  readonly value: string;
}

/** Discriminated union the dispatcher switches on (exhaustive, with `never` guard). */
export type ResolvedComponent =
  | {
      readonly type: 'Text';
      readonly id: string;
      readonly text: string;
      readonly variant?: TextVariant;
    }
  | {
      readonly type: 'Image';
      readonly id: string;
      readonly url: string;
      readonly altText: string;
    }
  | {
      readonly type: 'Icon';
      readonly id: string;
      readonly name: string;
      readonly altText?: string;
    }
  | {
      readonly type: 'Video';
      readonly id: string;
      readonly url: string;
      readonly altText?: string;
    }
  | {
      readonly type: 'AudioPlayer';
      readonly id: string;
      readonly url: string;
      readonly altText?: string;
    }
  | { readonly type: 'Row'; readonly id: string; readonly childrenIds: readonly string[] }
  | {
      readonly type: 'Column';
      readonly id: string;
      readonly childrenIds: readonly string[];
    }
  | {
      readonly type: 'List';
      readonly id: string;
      readonly childrenIds: readonly string[];
    }
  | { readonly type: 'Card'; readonly id: string; readonly childId: string }
  | {
      readonly type: 'Tabs';
      readonly id: string;
      readonly tabs: readonly { readonly title: string; readonly childId: string }[];
      readonly activeIndex: number;
    }
  | {
      readonly type: 'Modal';
      readonly id: string;
      readonly triggerId: string;
      readonly contentId: string;
    }
  | { readonly type: 'Divider'; readonly id: string }
  | {
      readonly type: 'Button';
      readonly id: string;
      readonly label: string;
      readonly variant?: 'primary' | 'borderless';
      readonly disabled: boolean;
      /** Set when the button is a local `openUrl` action; renders as button.url. */
      readonly url?: string;
      /** True when the button fires a server action; renderer encodes an action_id. */
      readonly hasServerAction: boolean;
    }
  | {
      readonly type: 'TextField';
      readonly id: string;
      readonly label: string;
      readonly value: string;
      readonly path: string;
      readonly multiline: boolean;
      readonly disabled: boolean;
    }
  | {
      readonly type: 'CheckBox';
      readonly id: string;
      readonly label: string;
      readonly checked: boolean;
      readonly path: string;
    }
  | {
      readonly type: 'ChoicePicker';
      readonly id: string;
      readonly options: readonly ChoiceOption[];
      readonly selected: readonly string[];
      readonly multiple: boolean;
      readonly path: string;
    }
  | {
      readonly type: 'Slider';
      readonly id: string;
      readonly min: number;
      readonly max: number;
      readonly value: number;
      readonly path: string;
    }
  | {
      readonly type: 'DateTimeInput';
      readonly id: string;
      readonly value?: string;
      readonly path: string;
      readonly mode: 'date' | 'time' | 'datetime';
    };

/** Narrow `ResolvedComponent` to one variant — what each renderer receives. */
export type ResolvedOf<T extends ComponentType> = Extract<ResolvedComponent, { type: T }>;
