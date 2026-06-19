import { DataContext, type ComponentModel, type SurfaceModel } from '@a2ui/web_core/v0_9';
import type {
  ChoiceOption,
  ResolvedComponent,
  TextVariant,
} from '../components/resolved-component.js';
import type {
  CustomComponent,
  CustomComponentRegistry,
} from '../components/custom/custom-component.js';
import type { ResolvedTree } from './resolved-tree.js';
import { resolveTree } from './resolve-tree.js';
import { indexPath, resolveDataPath } from './internal/data-path.js';
import {
  resolveArray,
  resolveBoolean,
  resolveNumber,
  resolveString,
  resolveStringList,
  resolveValue,
  writeBackPath,
} from './internal/dynamic-value.js';

/**
 * Bind a web_core {@link SurfaceModel} into a flat {@link ResolvedTree}: walk
 * from the conventional `'root'` component, resolve every dynamic prop against a
 * {@link DataContext} at the node's data scope, expand `List`/`Row`/`Column`
 * templates into per-item instances with namespaced ids, and bridge each raw
 * component into the Slack-shaped {@link ResolvedComponent} the renderers consume.
 *
 * Pass `custom` to enable registered custom-component resolution — unregistered
 * types continue to emit an unsupported `Text` node as before.
 *
 * Pure & deterministic: same surface state → same tree. Never throws — an
 * unknown component type or a missing child id becomes a visible unsupported
 * `Text` node rather than a silent drop or a crash.
 */
export function resolveSurface(
  surface: SurfaceModel,
  custom: CustomComponentRegistry = new Map(),
): ResolvedTree {
  const nodes: ResolvedComponent[] = [];
  emit(surface, nodes, 'root', 'root', '/', '', custom);
  return resolveTree({ root: 'root', nodes });
}

const TEXT_VARIANTS: ReadonlySet<string> = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'caption',
  'body',
]);

const BUTTON_VARIANTS: ReadonlySet<string> = new Set(['primary', 'borderless']);

/** A raw, type-narrowed component plus the scope it renders in. */
interface RawNode {
  readonly surface: SurfaceModel;
  readonly model: ComponentModel;
  /** Output id (already namespaced for template instances). */
  readonly outputId: string;
  /** Absolute data path this node and its dynamic props resolve against. */
  readonly basePath: string;
  readonly context: DataContext;
  /** Prefix applied to child output ids so template instances stay unique. */
  readonly idPrefix: string;
  readonly props: Record<string, unknown>;
  /** Registered custom components, for the resolveNode default-case dispatch. */
  readonly custom: CustomComponentRegistry;
}

/**
 * Resolve the component `modelId` at `basePath`, append its node (and its
 * descendants) to `nodes`, using `outputId` as the emitted id. `idPrefix` is the
 * namespace under which children are emitted (set for template instances).
 * `custom` is the registry of registered custom components, threaded through every
 * recursive call so the default-case dispatch has access at any depth.
 */
function emit(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  modelId: string,
  outputId: string,
  basePath: string,
  idPrefix: string,
  custom: CustomComponentRegistry,
): void {
  const model = surface.componentsModel.get(modelId);
  if (model === undefined) {
    nodes.push(unsupported(outputId, modelId));
    return;
  }
  const raw: RawNode = {
    surface,
    model,
    outputId,
    basePath,
    context: new DataContext(surface, basePath),
    idPrefix,
    // `properties` is typed `Record<string, any>`; read it only as `unknown`.
    props: model.properties as Record<string, unknown>,
    custom,
  };
  nodes.push(resolveNode(surface, nodes, raw));
}

// eslint-disable-next-line complexity
function resolveNode(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
): ResolvedComponent {
  switch (raw.model.type) {
    case 'Text':
    case 'Image':
    case 'Icon':
    case 'Video':
    case 'AudioPlayer':
      return resolveLeaf(raw);
    case 'Divider':
      return { type: 'Divider', id: raw.outputId };
    case 'Row':
    case 'Column':
    case 'List':
      return resolveContainer(surface, nodes, raw);
    case 'Card':
      return resolveCard(surface, nodes, raw);
    case 'Tabs':
      return resolveTabs(surface, nodes, raw);
    case 'Button':
      return resolveButton(raw);
    case 'TextField':
    case 'CheckBox':
    case 'ChoicePicker':
    case 'Slider':
    case 'DateTimeInput':
      return resolveInput(raw);
    default: {
      const component = raw.custom.get(raw.model.type);
      return component === undefined
        ? unsupported(raw.outputId, raw.model.type)
        : resolveCustom(raw, component);
    }
  }
}

/** A visible, never-silent fallback for unknown types / missing child ids. */
function unsupported(id: string, label: string): ResolvedComponent {
  return { type: 'Text', id, text: `⚠️ unsupported component: ${label}` };
}

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

function resolveLeaf(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id } = raw;
  switch (raw.model.type) {
    case 'Text': {
      const variant = textVariant(props['variant']);
      const text = resolveString(context, props['text']);
      return variant === undefined
        ? { type: 'Text', id, text }
        : { type: 'Text', id, text, variant };
    }
    case 'Image':
      return {
        type: 'Image',
        id,
        url: resolveString(context, props['url']),
        altText: resolveString(context, props['description']),
      };
    case 'Icon':
      return {
        type: 'Icon',
        id,
        name: typeof props['name'] === 'string' ? props['name'] : '',
      };
    case 'Video':
      return {
        type: 'Video',
        id,
        url: resolveString(context, props['url']),
        altText: resolveString(context, props['description']),
      };
    default:
      // 'AudioPlayer'
      return {
        type: 'AudioPlayer',
        id,
        url: resolveString(context, props['url']),
        altText: resolveString(context, props['description']),
      };
  }
}

function textVariant(raw: unknown): TextVariant | undefined {
  return typeof raw === 'string' && TEXT_VARIANTS.has(raw)
    ? (raw as TextVariant)
    : undefined;
}

// ---------------------------------------------------------------------------
// Containers (Row / Column / List) with template expansion
// ---------------------------------------------------------------------------

function resolveContainer(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
): ResolvedComponent {
  const childrenIds = expandChildren(surface, nodes, raw);
  switch (raw.model.type) {
    case 'Row':
      return { type: 'Row', id: raw.outputId, childrenIds };
    case 'List':
      return { type: 'List', id: raw.outputId, childrenIds };
    default:
      return { type: 'Column', id: raw.outputId, childrenIds };
  }
}

function expandChildren(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
): readonly string[] {
  const children = raw.props['children'];
  if (Array.isArray(children)) return staticChildren(surface, nodes, raw, children);
  const template = asTemplate(children);
  if (template !== undefined) return templateChildren(surface, nodes, raw, template);
  return [];
}

function staticChildren(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
  children: readonly unknown[],
): readonly string[] {
  const ids: string[] = [];
  for (const child of children) {
    const childModelId = String(child);
    const outputId = `${raw.idPrefix}${childModelId}`;
    emit(surface, nodes, childModelId, outputId, raw.basePath, raw.idPrefix, raw.custom);
    ids.push(outputId);
  }
  return ids;
}

function asTemplate(
  raw: unknown,
): { readonly componentId: string; readonly path: string } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const candidate = raw as { componentId?: unknown; path?: unknown };
  return typeof candidate.componentId === 'string' && typeof candidate.path === 'string'
    ? { componentId: candidate.componentId, path: candidate.path }
    : undefined;
}

function templateChildren(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
  template: { readonly componentId: string; readonly path: string },
): readonly string[] {
  const arrayPath = resolveDataPath(raw.basePath, template.path);
  const items = resolveArray(raw.context, { path: template.path });
  const ids: string[] = [];
  for (let i = 0; i < items.length; i++) {
    // Namespace EVERY descendant id with `${nodeId}#${i}` so instances stay unique.
    const instancePrefix = `${raw.outputId}#${String(i)}.`;
    const outputId = `${raw.outputId}#${String(i)}`;
    emit(
      surface,
      nodes,
      template.componentId,
      outputId,
      indexPath(arrayPath, i),
      instancePrefix,
      raw.custom,
    );
    ids.push(outputId);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Card / Tabs
// ---------------------------------------------------------------------------

function resolveCard(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
): ResolvedComponent {
  const childModelId = String(raw.props['child']);
  const childId = `${raw.idPrefix}${childModelId}`;
  emit(surface, nodes, childModelId, childId, raw.basePath, raw.idPrefix, raw.custom);
  return { type: 'Card', id: raw.outputId, childId };
}

function resolveTabs(
  surface: SurfaceModel,
  nodes: ResolvedComponent[],
  raw: RawNode,
): ResolvedComponent {
  const rawTabs = Array.isArray(raw.props['tabs']) ? raw.props['tabs'] : [];
  const tabs = rawTabs.map((entry: unknown) => {
    const tab = (entry ?? {}) as { title?: unknown; child?: unknown };
    const childModelId = String(tab.child);
    const childId = `${raw.idPrefix}${childModelId}`;
    emit(surface, nodes, childModelId, childId, raw.basePath, raw.idPrefix, raw.custom);
    return { title: resolveString(raw.context, tab.title), childId };
  });
  // V1 TODO: tab selection is not modelled in A2UI state yet — always start on
  // the first tab. Revisit when web_core surfaces an active-tab data binding.
  return { type: 'Tabs', id: raw.outputId, tabs, activeIndex: 0 };
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

function resolveButton(raw: RawNode): ResolvedComponent {
  return {
    type: 'Button',
    id: raw.outputId,
    label: buttonLabel(raw),
    ...buttonVariant(raw.props['variant']),
    // V1 TODO: `checks` are not evaluated yet, so a button is never disabled.
    disabled: false,
    // V1 TODO: no `openUrl` extraction yet — `url` stays unset, so every action
    // is treated as a server action and encoded into an action_id downstream.
    hasServerAction: raw.props['action'] !== undefined,
  };
}

/** Button label = the `child` Text's resolved text, else '' (renderer fills in). */
function buttonLabel(raw: RawNode): string {
  const childId = raw.props['child'];
  if (typeof childId !== 'string') return '';
  const child = raw.surface.componentsModel.get(childId);
  if (child === undefined || child.type !== 'Text') return '';
  return resolveString(
    raw.context,
    (child.properties as Record<string, unknown>)['text'],
  );
}

function buttonVariant(raw: unknown): { variant?: 'primary' | 'borderless' } {
  return typeof raw === 'string' && BUTTON_VARIANTS.has(raw)
    ? { variant: raw as 'primary' | 'borderless' }
    : {};
}

// ---------------------------------------------------------------------------
// Inputs (two-way bound)
// ---------------------------------------------------------------------------

function resolveInput(raw: RawNode): ResolvedComponent {
  switch (raw.model.type) {
    case 'TextField':
      return resolveTextField(raw);
    case 'CheckBox':
      return resolveCheckBox(raw);
    case 'ChoicePicker':
      return resolveChoicePicker(raw);
    case 'Slider':
      return resolveSlider(raw);
    default:
      // 'DateTimeInput'
      return resolveDateTimeInput(raw);
  }
}

function resolveTextField(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id, basePath } = raw;
  return {
    type: 'TextField',
    id,
    label: resolveString(context, props['label']),
    value: resolveString(context, props['value']),
    path: writeBackPath(basePath, props['value']),
    multiline: props['variant'] === 'longText',
    // V1 TODO: `checks` are not evaluated yet, so a field is never disabled.
    disabled: false,
  };
}

function resolveCheckBox(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id, basePath } = raw;
  return {
    type: 'CheckBox',
    id,
    label: resolveString(context, props['label']),
    checked: resolveBoolean(context, props['value']),
    path: writeBackPath(basePath, props['value']),
  };
}

function resolveChoicePicker(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id, basePath } = raw;
  const multiple = props['variant'] === 'multipleSelection';
  return {
    type: 'ChoicePicker',
    id,
    options: choiceOptions(raw),
    selected: multiple
      ? resolveStringList(context, props['value'])
      : selectedSingle(context, props['value']),
    multiple,
    path: writeBackPath(basePath, props['value']),
  };
}

function choiceOptions(raw: RawNode): readonly ChoiceOption[] {
  const rawOptions = Array.isArray(raw.props['options']) ? raw.props['options'] : [];
  return rawOptions.map((entry: unknown) => {
    const option = (entry ?? {}) as { label?: unknown; value?: unknown };
    return {
      label: resolveString(raw.context, option.label),
      value: resolveString(raw.context, option.value),
    };
  });
}

function selectedSingle(context: DataContext, raw: unknown): readonly string[] {
  const value = resolveString(context, raw, '');
  return value === '' ? [] : [value];
}

function resolveSlider(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id, basePath } = raw;
  const min = resolveNumber(context, props['min'], 0);
  return {
    type: 'Slider',
    id,
    min,
    max: resolveNumber(context, props['max'], 0),
    value: resolveNumber(context, props['value'], min),
    path: writeBackPath(basePath, props['value']),
  };
}

function resolveDateTimeInput(raw: RawNode): ResolvedComponent {
  const { props, context, outputId: id, basePath } = raw;
  const value = resolveString(context, props['value']);
  const enableDate = props['enableDate'] === true;
  const enableTime = props['enableTime'] === true;
  const mode: 'date' | 'time' | 'datetime' =
    enableDate && enableTime ? 'datetime' : enableTime ? 'time' : 'date';
  const base = {
    type: 'DateTimeInput' as const,
    id,
    path: writeBackPath(basePath, props['value']),
    mode,
  };
  return value === '' ? base : { ...base, value };
}

// ---------------------------------------------------------------------------
// Custom components
// ---------------------------------------------------------------------------

/** A single prop's classification: where it goes and its resolved payload. */
type ClassifiedProp =
  | { readonly slot: 'action'; readonly value: string }
  | { readonly slot: 'input'; readonly path: string; readonly current: unknown }
  | { readonly slot: 'prop'; readonly value: unknown };

/** Resolve a registered custom component: generic prop resolution + callback markers. */
function resolveCustom(raw: RawNode, component: CustomComponent): ResolvedComponent {
  const actionNames = new Set(component.actions ?? []);
  const inputNames = new Set(Object.keys(component.inputs ?? {}));
  const props: Record<string, unknown> = {};
  const actions: Record<string, string> = {};
  const inputs: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(raw.props)) {
    const c = classifyProp(raw, key, rawValue, actionNames, inputNames);
    if (c.slot === 'action') actions[key] = c.value;
    else if (c.slot === 'input') {
      inputs[key] = c.path;
      props[key] = c.current;
    } else props[key] = c.value;
  }
  return {
    type: 'Custom',
    id: raw.outputId,
    name: component.name,
    props,
    actions,
    inputs,
  };
}

/** Classify one prop by its declared marker; an action with no `{action:…}` falls through to `prop`. */
function classifyProp(
  raw: RawNode,
  key: string,
  rawValue: unknown,
  actionNames: ReadonlySet<string>,
  inputNames: ReadonlySet<string>,
): ClassifiedProp {
  if (actionNames.has(key)) {
    const action = asAction(rawValue);
    if (action !== undefined) return { slot: 'action', value: action };
  }
  if (inputNames.has(key)) {
    return {
      slot: 'input',
      path: writeBackPath(raw.basePath, rawValue),
      current: resolveValue(raw.context, rawValue),
    };
  }
  return { slot: 'prop', value: resolveValue(raw.context, rawValue) };
}

/** Narrow an A2UI action value ({ action: '…' }) to its action string. */
function asAction(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const candidate = (raw as { action?: unknown }).action;
  return typeof candidate === 'string' ? candidate : undefined;
}
