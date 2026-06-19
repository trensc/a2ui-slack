import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Catalog, MessageProcessor, type A2uiMessage, type SurfaceModel } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import type { ResolvedComponent } from '../components/resolved-component.js';
import {
  buildCustomRegistry,
  toComponentApi,
} from '../components/custom/custom-component.js';
import { resolveSurface } from './resolve-surface.js';

type RawComponent = Record<string, unknown> & { id: string; component: string };

/** Build a real web_core SurfaceModel from a data model + raw components. */
function buildSurface(dataModel: unknown, components: RawComponent[]): SurfaceModel {
  const processor = new MessageProcessor([new Catalog('basic', BASIC_COMPONENTS)]);
  processor.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'basic' } },
    { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: dataModel } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
  ]);
  const surface = processor.model.getSurface('s');
  if (surface === undefined) throw new Error('surface not created');
  return surface;
}

/** Resolve a fixture and return the node map for value assertions. */
function resolve(
  dataModel: unknown,
  components: RawComponent[],
): Map<string, ResolvedComponent> {
  const tree = resolveSurface(buildSurface(dataModel, components));
  return new Map(tree.byId);
}

describe('resolveSurface', () => {
  it('returns root and an id-keyed map', () => {
    const tree = resolveSurface(
      buildSurface({}, [{ id: 'root', component: 'Text', text: 'hi' }]),
    );
    expect(tree.root).toBe('root');
    expect(tree.byId.get('root')).toEqual({ type: 'Text', id: 'root', text: 'hi' });
  });

  it('resolves a {path} binding to its data value', () => {
    const byId = resolve({ name: 'Ada' }, [
      { id: 'root', component: 'Text', text: { path: '/name' }, variant: 'h1' },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'Text',
      id: 'root',
      text: 'Ada',
      variant: 'h1',
    });
  });

  it('drops an out-of-union Text variant', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Text', text: 'x', variant: 'bogus' },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Text', id: 'root', text: 'x' });
  });

  it('resolves Image / Video / AudioPlayer urls and descriptions', () => {
    const byId = resolve({ u: 'http://x' }, [
      { id: 'root', component: 'Column', children: ['img', 'vid', 'aud'] },
      { id: 'img', component: 'Image', url: { path: '/u' }, description: 'alt' },
      { id: 'vid', component: 'Video', url: 'v', description: 'vd' },
      { id: 'aud', component: 'AudioPlayer', url: 'a', description: 'ad' },
    ]);
    expect(byId.get('img')).toEqual({
      type: 'Image',
      id: 'img',
      url: 'http://x',
      altText: 'alt',
    });
    expect(byId.get('vid')).toEqual({
      type: 'Video',
      id: 'vid',
      url: 'v',
      altText: 'vd',
    });
    expect(byId.get('aud')).toEqual({
      type: 'AudioPlayer',
      id: 'aud',
      url: 'a',
      altText: 'ad',
    });
  });

  it('keeps a string Icon name and blanks object name forms', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Row', children: ['i1', 'i2'] },
      { id: 'i1', component: 'Icon', name: 'star' },
      { id: 'i2', component: 'Icon', name: { svgPath: '<svg/>' } },
    ]);
    expect(byId.get('i1')).toEqual({ type: 'Icon', id: 'i1', name: 'star' });
    expect(byId.get('i2')).toEqual({ type: 'Icon', id: 'i2', name: '' });
  });

  it('emits a Divider', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Column', children: ['d'] },
      { id: 'd', component: 'Divider' },
    ]);
    expect(byId.get('d')).toEqual({ type: 'Divider', id: 'd' });
  });

  it('expands a List template into per-item instances with unique ids', () => {
    const byId = resolve({ items: [{ label: 'A' }, { label: 'B' }] }, [
      {
        id: 'root',
        component: 'List',
        children: { componentId: 'tmpl', path: '/items' },
      },
      { id: 'tmpl', component: 'Text', text: { path: 'label' } },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'List',
      id: 'root',
      childrenIds: ['root#0', 'root#1'],
    });
    expect(byId.get('root#0')).toEqual({ type: 'Text', id: 'root#0', text: 'A' });
    expect(byId.get('root#1')).toEqual({ type: 'Text', id: 'root#1', text: 'B' });
  });

  it('namespaces descendant ids inside template instances', () => {
    const byId = resolve({ items: [{ label: 'A' }] }, [
      {
        id: 'root',
        component: 'List',
        children: { componentId: 'card', path: '/items' },
      },
      { id: 'card', component: 'Card', child: 'inner' },
      { id: 'inner', component: 'Text', text: { path: 'label' } },
    ]);
    expect(byId.get('root#0')).toEqual({
      type: 'Card',
      id: 'root#0',
      childId: 'root#0.inner',
    });
    expect(byId.get('root#0.inner')).toEqual({
      type: 'Text',
      id: 'root#0.inner',
      text: 'A',
    });
  });

  it('treats an empty/absent template array as no children', () => {
    const byId = resolve({}, [
      {
        id: 'root',
        component: 'List',
        children: { componentId: 'tmpl', path: '/missing' },
      },
      { id: 'tmpl', component: 'Text', text: 'x' },
    ]);
    expect(byId.get('root')).toEqual({ type: 'List', id: 'root', childrenIds: [] });
  });

  it('treats malformed children (neither array nor template) as empty', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Row', children: 'nope' }]);
    expect(byId.get('root')).toEqual({ type: 'Row', id: 'root', childrenIds: [] });
  });

  it('treats a children object that is not a valid template as empty', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Row', children: { path: '/x' } },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Row', id: 'root', childrenIds: [] });
  });

  it('expands a template over a root-level array (root index paths)', () => {
    const byId = resolve(
      [{ label: 'A' }, { label: 'B' }],
      [
        { id: 'root', component: 'List', children: { componentId: 'tmpl', path: '/' } },
        { id: 'tmpl', component: 'TextField', label: 'L', value: { path: 'label' } },
      ],
    );
    expect(byId.get('root')).toEqual({
      type: 'List',
      id: 'root',
      childrenIds: ['root#0', 'root#1'],
    });
    // Index path joined against the root array scope: '/0/label', '/1/label'.
    expect(byId.get('root#0')).toMatchObject({ value: 'A', path: '/0/label' });
    expect(byId.get('root#1')).toMatchObject({ value: 'B', path: '/1/label' });
  });

  it('resolves a Card child', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Card', child: 'body' },
      { id: 'body', component: 'Text', text: 'hi' },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Card', id: 'root', childId: 'body' });
    expect(byId.get('body')).toEqual({ type: 'Text', id: 'body', text: 'hi' });
  });

  it('resolves Tabs with resolved titles and activeIndex 0', () => {
    const byId = resolve({ t: 'Second' }, [
      {
        id: 'root',
        component: 'Tabs',
        tabs: [
          { title: 'First', child: 'a' },
          { title: { path: '/t' }, child: 'b' },
        ],
      },
      { id: 'a', component: 'Text', text: 'A' },
      { id: 'b', component: 'Text', text: 'B' },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'Tabs',
      id: 'root',
      activeIndex: 0,
      tabs: [
        { title: 'First', childId: 'a' },
        { title: 'Second', childId: 'b' },
      ],
    });
  });

  it('treats absent Tabs list as empty', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Tabs' }]);
    expect(byId.get('root')).toEqual({
      type: 'Tabs',
      id: 'root',
      tabs: [],
      activeIndex: 0,
    });
  });

  it('tolerates a null tab entry without throwing', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Tabs', tabs: [null] }]);
    expect(byId.get('root')).toEqual({
      type: 'Tabs',
      id: 'root',
      activeIndex: 0,
      tabs: [{ title: '', childId: 'undefined' }],
    });
  });

  it('uses a Text child as the Button label and flags server action + variant', () => {
    const byId = resolve({}, [
      {
        id: 'root',
        component: 'Button',
        child: 'lbl',
        action: { action: 'go' },
        variant: 'primary',
      },
      { id: 'lbl', component: 'Text', text: 'Click me' },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'Button',
      id: 'root',
      label: 'Click me',
      variant: 'primary',
      disabled: false,
      hasServerAction: true,
    });
    // The button's child is NOT emitted as its own node.
    expect(byId.has('lbl')).toBe(false);
  });

  it('blanks the Button label when the child is missing or not a Text', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Column', children: ['b1', 'b2', 'b3'] },
      { id: 'b1', component: 'Button', child: 'gone' },
      { id: 'b2', component: 'Button', child: 'img' },
      { id: 'b3', component: 'Button' },
      { id: 'img', component: 'Image', url: 'u' },
    ]);
    expect(byId.get('b1')).toEqual({
      type: 'Button',
      id: 'b1',
      label: '',
      disabled: false,
      hasServerAction: false,
    });
    expect(byId.get('b2')).toEqual({
      type: 'Button',
      id: 'b2',
      label: '',
      disabled: false,
      hasServerAction: false,
    });
    expect(byId.get('b3')).toEqual({
      type: 'Button',
      id: 'b3',
      label: '',
      disabled: false,
      hasServerAction: false,
    });
  });

  it('drops an out-of-union Button variant', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Button', child: 'lbl', variant: 'default' },
      { id: 'lbl', component: 'Text', text: 'x' },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'Button',
      id: 'root',
      label: 'x',
      disabled: false,
      hasServerAction: false,
    });
  });

  it('resolves a TextField value + write-back path and multiline flag', () => {
    const byId = resolve({ name: 'Ada' }, [
      {
        id: 'root',
        component: 'TextField',
        label: 'Name',
        value: { path: '/name' },
        variant: 'longText',
      },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'TextField',
      id: 'root',
      label: 'Name',
      value: 'Ada',
      path: '/name',
      multiline: true,
      disabled: false,
    });
  });

  it('joins a relative write-back path against the root scope', () => {
    const byId = resolve({ name: 'Ada' }, [
      { id: 'root', component: 'TextField', label: 'N', value: { path: 'name' } },
    ]);
    expect(byId.get('root')).toMatchObject({ value: 'Ada', path: '/name' });
  });

  it('uses an empty write-back path for a literal TextField value', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'TextField', label: 'L', value: 'lit' },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'TextField',
      id: 'root',
      label: 'L',
      value: 'lit',
      path: '',
      multiline: false,
      disabled: false,
    });
  });

  it('uses an empty write-back path for a {call} input value (object, no path)', () => {
    const byId = resolve({}, [
      {
        id: 'root',
        component: 'CheckBox',
        label: 'C',
        value: { call: 'noop', args: {}, returnType: 'boolean' },
      },
    ]);
    expect(byId.get('root')).toMatchObject({ path: '' });
  });

  it('resolves a CheckBox checked state from a boolean path', () => {
    const byId = resolve({ on: true }, [
      { id: 'root', component: 'CheckBox', label: 'Agree', value: { path: '/on' } },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'CheckBox',
      id: 'root',
      label: 'Agree',
      checked: true,
      path: '/on',
    });
  });

  it('resolves a multi-selection ChoicePicker', () => {
    const byId = resolve({ picks: ['x'] }, [
      {
        id: 'root',
        component: 'ChoicePicker',
        label: 'Pick',
        value: { path: '/picks' },
        variant: 'multipleSelection',
        options: [
          { label: 'X', value: 'x' },
          { label: 'Y', value: 'y' },
        ],
      },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'ChoicePicker',
      id: 'root',
      options: [
        { label: 'X', value: 'x' },
        { label: 'Y', value: 'y' },
      ],
      selected: ['x'],
      multiple: true,
      path: '/picks',
    });
  });

  it('wraps a scalar multi-selection value into a one-element list', () => {
    const byId = resolve({ pick: 'x' }, [
      {
        id: 'root',
        component: 'ChoicePicker',
        value: { path: '/pick' },
        variant: 'multipleSelection',
        options: [{ label: 'X', value: 'x' }],
      },
    ]);
    expect(byId.get('root')).toMatchObject({ selected: ['x'], multiple: true });
  });

  it('yields an empty multi-selection when the bound value is absent', () => {
    const byId = resolve({}, [
      {
        id: 'root',
        component: 'ChoicePicker',
        value: { path: '/missing' },
        variant: 'multipleSelection',
        options: [],
      },
    ]);
    expect(byId.get('root')).toMatchObject({ selected: [], multiple: true });
  });

  it('resolves a single-selection ChoicePicker, empty when unset', () => {
    const byId = resolve({ pick: 'y', empty: '' }, [
      { id: 'root', component: 'Column', children: ['c1', 'c2'] },
      {
        id: 'c1',
        component: 'ChoicePicker',
        value: { path: '/pick' },
        options: [{ label: 'Y', value: 'y' }],
      },
      { id: 'c2', component: 'ChoicePicker', value: { path: '/empty' }, options: [] },
    ]);
    expect(byId.get('c1')).toMatchObject({
      selected: ['y'],
      multiple: false,
      path: '/pick',
    });
    expect(byId.get('c2')).toMatchObject({ selected: [], multiple: false, options: [] });
  });

  it('tolerates absent options and a null option entry', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Column', children: ['noopts', 'nullopt'] },
      { id: 'noopts', component: 'ChoicePicker', value: 'x' },
      { id: 'nullopt', component: 'ChoicePicker', value: 'x', options: [null] },
    ]);
    expect(byId.get('noopts')).toMatchObject({ options: [] });
    expect(byId.get('nullopt')).toMatchObject({ options: [{ label: '', value: '' }] });
  });

  it('resolves a Slider with min/max/value', () => {
    const byId = resolve({ v: 7 }, [
      { id: 'root', component: 'Slider', min: 1, max: 10, value: { path: '/v' } },
    ]);
    expect(byId.get('root')).toEqual({
      type: 'Slider',
      id: 'root',
      min: 1,
      max: 10,
      value: 7,
      path: '/v',
    });
  });

  it('defaults Slider min to 0 and value to min', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Slider', max: 5 }]);
    expect(byId.get('root')).toEqual({
      type: 'Slider',
      id: 'root',
      min: 0,
      max: 5,
      value: 0,
      path: '',
    });
  });

  it('falls back to min when a Slider value resolves to a non-number', () => {
    const byId = resolve({ word: 'abc' }, [
      { id: 'root', component: 'Slider', min: 2, max: 9, value: { path: '/word' } },
    ]);
    expect(byId.get('root')).toMatchObject({ min: 2, value: 2, path: '/word' });
  });

  it('falls back to empty text when a binding resolves to a missing path', () => {
    const byId = resolve({}, [
      { id: 'root', component: 'Text', text: { path: '/gone' } },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Text', id: 'root', text: '' });
  });

  it('renders an explicit null data value as empty text', () => {
    const byId = resolve({ n: null }, [
      { id: 'root', component: 'Text', text: { path: '/n' } },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Text', id: 'root', text: '' });
  });

  it('JSON-encodes an object/array data value instead of [object Object]', () => {
    const byId = resolve({ obj: { a: 1 } }, [
      { id: 'root', component: 'Text', text: { path: '/obj' } },
    ]);
    expect(byId.get('root')).toEqual({ type: 'Text', id: 'root', text: '{"a":1}' });
  });

  it('resolves DateTimeInput modes from the enable flags', () => {
    const byId = resolve({ d: '2026-06-05' }, [
      { id: 'root', component: 'Column', children: ['dt', 'd', 't', 'none'] },
      {
        id: 'dt',
        component: 'DateTimeInput',
        value: { path: '/d' },
        enableDate: true,
        enableTime: true,
      },
      { id: 'd', component: 'DateTimeInput', value: { path: '/d' }, enableDate: true },
      { id: 't', component: 'DateTimeInput', value: 'x', enableTime: true },
      { id: 'none', component: 'DateTimeInput', value: '' },
    ]);
    expect(byId.get('dt')).toEqual({
      type: 'DateTimeInput',
      id: 'dt',
      value: '2026-06-05',
      path: '/d',
      mode: 'datetime',
    });
    expect(byId.get('d')).toEqual({
      type: 'DateTimeInput',
      id: 'd',
      value: '2026-06-05',
      path: '/d',
      mode: 'date',
    });
    expect(byId.get('t')).toEqual({
      type: 'DateTimeInput',
      id: 't',
      value: 'x',
      path: '',
      mode: 'time',
    });
    expect(byId.get('none')).toEqual({
      type: 'DateTimeInput',
      id: 'none',
      path: '',
      mode: 'date',
    });
  });

  it('emits an unsupported Text for a missing child id', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Column', children: ['ghost'] }]);
    expect(byId.get('ghost')).toEqual({
      type: 'Text',
      id: 'ghost',
      text: '⚠️ unsupported component: ghost',
    });
  });

  it('emits an unsupported Text for an unknown component type', () => {
    const byId = resolve({}, [{ id: 'root', component: 'Bogus', foo: 'bar' }]);
    expect(byId.get('root')).toEqual({
      type: 'Text',
      id: 'root',
      text: '⚠️ unsupported component: Bogus',
    });
  });

  it('emits an unsupported Text when the root component is absent', () => {
    const surface = buildSurface({}, [{ id: 'other', component: 'Text', text: 'x' }]);
    const tree = resolveSurface(surface);
    expect(tree.byId.get('root')).toEqual({
      type: 'Text',
      id: 'root',
      text: '⚠️ unsupported component: root',
    });
  });

  it('joins relative write-back paths against the item scope inside templates', () => {
    const byId = resolve({ rows: [{ name: 'Ada' }, { name: 'Bo' }] }, [
      { id: 'root', component: 'List', children: { componentId: 'tf', path: '/rows' } },
      { id: 'tf', component: 'TextField', label: 'N', value: { path: 'name' } },
    ]);
    expect(byId.get('root#0')).toMatchObject({ value: 'Ada', path: '/rows/0/name' });
    expect(byId.get('root#1')).toMatchObject({ value: 'Bo', path: '/rows/1/name' });
  });
});

// ---------------------------------------------------------------------------
// Helper for custom-component tests: process raw A2UI messages with a registry
// ---------------------------------------------------------------------------

/**
 * Build a real web_core SurfaceModel from a raw message sequence.
 * The catalog id used in createSurface MUST match the one registered here ('a2ui-slack').
 * Any custom components in `customRegistry` are added to the catalog so web_core
 * accepts their types in updateComponents messages.
 */
function surfaceFrom(
  messages: A2uiMessage[],
  customRegistry = buildCustomRegistry([]),
): SurfaceModel {
  const customApis = [...customRegistry.values()].map(toComponentApi);
  const processor = new MessageProcessor([
    new Catalog('a2ui-slack', [...BASIC_COMPONENTS, ...customApis]),
  ]);
  processor.processMessages(messages);
  const surfaceId = messages
    .map((m) => ('createSurface' in m ? m.createSurface.surfaceId : undefined))
    .find((id) => id !== undefined);
  if (surfaceId === undefined) throw new Error('no createSurface message found');
  const surface = processor.model.getSurface(surfaceId);
  if (surface === undefined) throw new Error('surface not created');
  return surface;
}

// ---------------------------------------------------------------------------
// Custom component resolution
// ---------------------------------------------------------------------------

describe('custom component resolution', () => {
  const registry = buildCustomRegistry([
    {
      name: 'ApprovalCard',
      schema: z.object({
        title: z.string().optional(),
        onApprove: z.unknown().optional(),
        comment: z.unknown().optional(),
      }),
      actions: ['onApprove'],
      inputs: { comment: {} },
      render: () => [],
    },
  ]);

  it('emits a Custom node with resolved props, actions, and input paths', () => {
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [
              {
                id: 'root',
                component: 'ApprovalCard',
                title: 'Deploy?',
                onApprove: { action: 'deploy' },
                comment: { path: '/note' },
              },
            ],
          },
        },
      ],
      registry,
    );
    const tree = resolveSurface(surface, registry);
    const node = tree.byId.get('root');
    expect(node).toMatchObject({ type: 'Custom', name: 'ApprovalCard' });
    if (node?.type !== 'Custom') throw new Error('expected Custom');
    expect(node.props['title']).toBe('Deploy?');
    expect(node.actions['onApprove']).toBe('deploy');
    expect(node.inputs['comment']).toBe('/note');
  });

  it('falls back to unsupported Text for an unregistered type', () => {
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [{ id: 'root', component: 'Unknownz' }],
          },
        },
      ],
    );
    const node = resolveSurface(surface, registry).byId.get('root');
    expect(node).toEqual({ type: 'Text', id: 'root', text: '⚠️ unsupported component: Unknownz' });
  });

  it('treats an action prop with no {action:…} shape as a plain prop', () => {
    // onApprove is declared as an action, but the agent supplied a non-action literal.
    // classifyProp falls through to the 'prop' slot.
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [
              { id: 'root', component: 'ApprovalCard', onApprove: 'not-an-action' },
            ],
          },
        },
      ],
      registry,
    );
    const node = resolveSurface(surface, registry).byId.get('root');
    if (node?.type !== 'Custom') throw new Error('expected Custom');
    // onApprove was not {action:…} so it lands in props, not actions.
    expect(node.actions['onApprove']).toBeUndefined();
    expect(node.props['onApprove']).toBe('not-an-action');
  });

  it('treats a null action prop as a plain prop (asAction null branch)', () => {
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [
              { id: 'root', component: 'ApprovalCard', onApprove: null },
            ],
          },
        },
      ],
      registry,
    );
    const node = resolveSurface(surface, registry).byId.get('root');
    if (node?.type !== 'Custom') throw new Error('expected Custom');
    expect(node.actions['onApprove']).toBeUndefined();
  });

  it('resolves a custom component with no actions or inputs declared (nullish coalescing fallback)', () => {
    // Component has no `actions` or `inputs` fields — exercises the ?? [] / ?? {} branches.
    const minimalRegistry = buildCustomRegistry([
      {
        name: 'MinimalCard',
        schema: z.object({ title: z.string().optional() }),
        render: () => [],
        // actions and inputs intentionally absent
      },
    ]);
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [{ id: 'root', component: 'MinimalCard', title: 'Hi' }],
          },
        },
      ],
      minimalRegistry,
    );
    const node = resolveSurface(surface, minimalRegistry).byId.get('root');
    if (node?.type !== 'Custom') throw new Error('expected Custom');
    expect(node.name).toBe('MinimalCard');
    expect(node.props['title']).toBe('Hi');
  });

  it('treats an action prop whose {action} value is non-string as a plain prop', () => {
    // Exercises the false branch of `typeof candidate === 'string'` in asAction.
    const surface = surfaceFrom(
      [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'a2ui-slack' } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's',
            components: [
              { id: 'root', component: 'ApprovalCard', onApprove: { action: 42 } },
            ],
          },
        },
      ],
      registry,
    );
    const node = resolveSurface(surface, registry).byId.get('root');
    if (node?.type !== 'Custom') throw new Error('expected Custom');
    // {action: 42} is not a string action — falls through to props.
    expect(node.actions['onApprove']).toBeUndefined();
  });
});
