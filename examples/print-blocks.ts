/**
 * Visual E2E smoke test (no Slack account needed).
 *
 *   npx tsx examples/print-blocks.ts
 *
 * Builds a small resolved A2UI tree, assembles it to Slack Block Kit, and prints
 * the JSON. Copy the `blocks` array into https://app.slack.com/block-kit-builder
 * to see it rendered. This exercises the real pure pipeline:
 *   resolveTree (skeleton) -> assembleSurface -> renderComponent -> blocks.
 */
import {
  assembleSurface,
  emptyRegistry,
  resolveTree,
  type ResolvedComponent,
} from '../src/index.js';

const nodes: ResolvedComponent[] = [
  {
    type: 'Column',
    id: 'root',
    childrenIds: ['title', 'intro', 'name', 'agree', 'submit'],
  },
  { type: 'Text', id: 'title', text: 'Hello from A2UI', variant: 'h1' },
  {
    type: 'Text',
    id: 'intro',
    text: 'This message was rendered to *Slack Block Kit* by `a2ui-slack`.',
  },
  {
    type: 'TextField',
    id: 'name',
    label: 'Your name',
    value: '',
    path: '/name',
    multiline: false,
    disabled: false,
  },
  {
    type: 'CheckBox',
    id: 'agree',
    label: 'I agree to the terms',
    checked: false,
    path: '/agree',
  },
  {
    type: 'Button',
    id: 'submit',
    label: 'Submit',
    variant: 'primary',
    disabled: false,
    hasServerAction: true,
  },
];

const result = assembleSurface({
  tree: resolveTree({ root: 'root', nodes }),
  surfaceId: 'demo-surface',
  surfaceKind: 'message',
  registry: emptyRegistry,
});

console.log('=== blocks (paste into Block Kit Builder) ===');
console.log(JSON.stringify(result.blocks, null, 2));
console.log('\n=== degradations ===');
console.log(JSON.stringify(result.degradations, null, 2));
console.log('\n=== notices ===');
console.log(JSON.stringify(result.notices, null, 2));
