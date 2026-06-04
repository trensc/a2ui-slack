/**
 * Full real pipeline demo (no Slack account needed):
 *
 *   npx tsx examples/render-agent-message.ts
 *
 * Feeds A2UI v0.9 messages through web_core's MessageProcessor, resolves the
 * bound surface to a ResolvedComponent tree (resolveSurface), assembles it to
 * Slack Block Kit (assembleSurface), and prints the blocks. Copy the `blocks`
 * array into https://app.slack.com/block-kit-builder to see it rendered.
 *
 * This is the impure consumer's job (it holds the stateful MessageProcessor) —
 * hence it lives in examples/, never in src/.
 */
import { MessageProcessor, Catalog } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import { assembleSurface, emptyRegistry, resolveSurface } from '../src/index.js';

const processor = new MessageProcessor([new Catalog('a2ui-slack', BASIC_COMPONENTS)]);

processor.processMessages([
  { version: 'v0.9', createSurface: { surfaceId: 's1', catalogId: 'a2ui-slack' } },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: 's1',
      path: '/',
      value: {
        user: { name: 'Ada' },
        todos: [{ label: 'Write spec' }, { label: 'Ship renderer' }],
        newTodo: '',
      },
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 's1',
      components: [
        { component: 'Column', id: 'root', children: ['hi', 'list', 'field', 'add'] },
        { component: 'Text', id: 'hi', text: { path: '/user/name' }, variant: 'h1' },
        { component: 'List', id: 'list', children: { componentId: 'todoTmpl', path: '/todos' } },
        { component: 'Text', id: 'todoTmpl', text: { path: 'label' } },
        { component: 'TextField', id: 'field', label: 'New todo', value: { path: '/newTodo' } },
        { component: 'Button', id: 'add', child: 'addLabel', action: { event: { name: 'addTodo' } } },
        { component: 'Text', id: 'addLabel', text: 'Add' },
      ],
    },
  },
]);

const surface = processor.model.getSurface('s1');
if (surface === undefined) throw new Error('surface not created');

const tree = resolveSurface(surface);
const assembled = assembleSurface({
  tree,
  surfaceId: 's1',
  surfaceKind: 'message',
  registry: emptyRegistry,
});

console.log('=== blocks (paste into Block Kit Builder) ===');
console.log(JSON.stringify(assembled.blocks, null, 2));
console.log('\n=== degradations ===', JSON.stringify(assembled.degradations));
console.log('=== notices ===', JSON.stringify(assembled.notices));
