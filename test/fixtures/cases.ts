import type { ComponentType, SurfaceKind } from '../../src/index.js';
import type { RawComponent } from './render-fixture.js';

/** One golden conformance fixture: an A2UI surface and the surface kind it targets. */
export interface Fixture {
  readonly name: string;
  readonly surfaceKind: SurfaceKind;
  readonly dataModel: unknown;
  readonly components: readonly RawComponent[];
  /** Component types this fixture is meant to exercise (cross-checked at runtime). */
  readonly covers: readonly ComponentType[];
}

/**
 * Golden A2UI messages spanning every catalog component that resolveSurface can
 * emit. Their rendered Block Kit is snapshotted in __snapshots__ and validated
 * against Slack's limits. `Modal` is intentionally absent — it is a surface-level
 * component (a trigger whose content renders as its own surface), never produced
 * by resolveSurface; the coverage test names it as the sole expected gap.
 */
export const FIXTURES: readonly Fixture[] = [
  {
    name: 'rich-message',
    surfaceKind: 'message',
    dataModel: { title: 'Release 1.0', author: 'Ada', cover: 'https://img/c.png' },
    components: [
      { id: 'root', component: 'Column', children: ['h', 'pic', 'sep', 'meta', 'cta'] },
      { id: 'h', component: 'Text', text: { path: '/title' }, variant: 'h1' },
      {
        id: 'pic',
        component: 'Image',
        url: { path: '/cover' },
        description: 'cover art',
      },
      { id: 'sep', component: 'Divider' },
      { id: 'meta', component: 'Row', children: ['k', 'v'] },
      { id: 'k', component: 'Text', text: 'Author' },
      { id: 'v', component: 'Text', text: { path: '/author' } },
      {
        id: 'cta',
        component: 'Button',
        child: 'cta-l',
        action: { action: 'ship' },
        variant: 'primary',
      },
      { id: 'cta-l', component: 'Text', text: 'Ship it' },
    ],
    covers: ['Column', 'Text', 'Image', 'Divider', 'Row', 'Button'],
  },
  {
    name: 'media',
    surfaceKind: 'message',
    dataModel: {},
    components: [
      { id: 'root', component: 'Column', children: ['vid', 'aud', 'ico'] },
      {
        id: 'vid',
        component: 'Video',
        url: 'https://v/clip.mp4',
        description: 'demo clip',
      },
      {
        id: 'aud',
        component: 'AudioPlayer',
        url: 'https://a/track.mp3',
        description: 'theme',
      },
      { id: 'ico', component: 'Icon', name: 'rocket' },
    ],
    covers: ['Column', 'Video', 'AudioPlayer', 'Icon'],
  },
  {
    name: 'list-of-cards',
    surfaceKind: 'message',
    dataModel: { items: [{ label: 'First' }, { label: 'Second' }] },
    components: [
      {
        id: 'root',
        component: 'List',
        children: { componentId: 'card', path: '/items' },
      },
      { id: 'card', component: 'Card', child: 'body' },
      { id: 'body', component: 'Text', text: { path: 'label' } },
    ],
    covers: ['List', 'Card', 'Text'],
  },
  {
    name: 'tabs',
    surfaceKind: 'message',
    dataModel: {},
    components: [
      {
        id: 'root',
        component: 'Tabs',
        tabs: [
          { title: 'Overview', child: 't0' },
          { title: 'Details', child: 't1' },
        ],
      },
      { id: 't0', component: 'Text', text: 'Overview body' },
      { id: 't1', component: 'Text', text: 'Details body' },
    ],
    covers: ['Tabs', 'Text'],
  },
  {
    name: 'form',
    surfaceKind: 'modal',
    dataModel: { name: 'Ada', agree: false, plan: 'pro', volume: 4, when: '2026-06-06' },
    components: [
      { id: 'root', component: 'Column', children: ['nm', 'ok', 'pl', 'vol', 'dt'] },
      { id: 'nm', component: 'TextField', label: 'Name', value: { path: '/name' } },
      { id: 'ok', component: 'CheckBox', label: 'I agree', value: { path: '/agree' } },
      {
        id: 'pl',
        component: 'ChoicePicker',
        label: 'Plan',
        value: { path: '/plan' },
        options: [
          { label: 'Free', value: 'free' },
          { label: 'Pro', value: 'pro' },
        ],
      },
      { id: 'vol', component: 'Slider', min: 0, max: 10, value: { path: '/volume' } },
      {
        id: 'dt',
        component: 'DateTimeInput',
        value: { path: '/when' },
        enableDate: true,
      },
    ],
    covers: [
      'Column',
      'TextField',
      'CheckBox',
      'ChoicePicker',
      'Slider',
      'DateTimeInput',
    ],
  },
];
