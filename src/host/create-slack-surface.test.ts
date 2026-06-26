import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { ActionsBlock, InputBlock } from '@slack/types';
import type { TokenRegistry } from '../action-id/action-id.js';
import type { SlackInteractionPayload } from '../actions/interpret-payload.js';
import type { CustomComponent } from '../components/custom/custom-component.js';
import type { RegistryStore } from './registry-store.js';
import { createSlackSurface } from './create-slack-surface.js';

/** A minimal surface: Column -> Button(action) -> Text label. */
const MESSAGES: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: 's1', catalogId: 'a2ui-slack' } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 's1',
      components: [
        { component: 'Column', id: 'root', children: ['btn'] },
        {
          component: 'Button',
          id: 'btn',
          child: 'lbl',
          action: { event: { name: 'go' } },
        },
        { component: 'Text', id: 'lbl', text: 'Go' },
      ],
    },
  },
];

/** A RegistryStore that records the keys it is asked for, to assert keying. */
class RecordingStore implements RegistryStore {
  readonly getKeys: string[] = [];
  readonly setKeys: string[] = [];
  private readonly map = new Map<string, TokenRegistry>();
  get(key: string): Promise<TokenRegistry | undefined> {
    this.getKeys.push(key);
    return Promise.resolve(this.map.get(key));
  }
  set(key: string, registry: TokenRegistry): Promise<void> {
    this.setKeys.push(key);
    this.map.set(key, registry);
    return Promise.resolve();
  }
}

describe('createSlackSurface.render', () => {
  it('renders processed A2UI messages to Slack blocks', async () => {
    const surface = createSlackSurface();
    const { blocks } = await surface.render('s1', MESSAGES);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks).toContainEqual(expect.objectContaining({ type: 'actions' }));
  });

  it('throws a clear error when the surface was never created', async () => {
    const surface = createSlackSurface();
    await expect(surface.render('ghost', [])).rejects.toThrow(
      /ghost.*createSurface message first/s,
    );
  });

  it('persists the grown registry under the surface key and reuses it on re-render', async () => {
    const store = new RecordingStore();
    const surface = createSlackSurface({ store });
    await surface.render('s1', MESSAGES);
    await surface.render('s1', []);
    expect(store.setKeys).toEqual(['s1', 's1']);
    expect(store.getKeys).toEqual(['s1', 's1']);
  });

  it('namespaces the store key with keyPrefix', async () => {
    const store = new RecordingStore();
    const surface = createSlackSurface({
      store,
      keyPrefix: 'team1:',
      catalogId: 'a2ui-slack',
    });
    await surface.render('s1', MESSAGES);
    expect(store.setKeys).toEqual(['team1:s1']);
  });

  it('accepts an explicit surfaceKind', async () => {
    const surface = createSlackSurface();
    const asModal = await surface.render('s1', MESSAGES, 'modal');
    expect(asModal.blocks.length).toBeGreaterThan(0);
  });

  it('registers the catalog under the custom catalogId so messages that reference it resolve correctly', async () => {
    const customMessages: A2uiMessage[] = [
      { version: 'v0.9', createSurface: { surfaceId: 's2', catalogId: 'custom-cat' } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 's2',
          components: [
            { component: 'Column', id: 'root', children: ['btn'] },
            {
              component: 'Button',
              id: 'btn',
              child: 'lbl',
              action: { event: { name: 'go' } },
            },
            { component: 'Text', id: 'lbl', text: 'Go' },
          ],
        },
      },
    ];
    const surface = createSlackSurface({ catalogId: 'custom-cat' });
    const { blocks } = await surface.render('s2', customMessages);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks).toContainEqual(expect.objectContaining({ type: 'actions' }));
  });
});

describe('createSlackSurface.inbound', () => {
  it('decodes a click on a button rendered earlier (full registry round-trip)', async () => {
    const surface = createSlackSurface();
    // Read the action_id back from the rendered blocks instead of assuming an ordinal.
    const { blocks } = await surface.render('s1', MESSAGES);
    const actionsBlock = blocks.find((b): b is ActionsBlock => b.type === 'actions');
    const firstElement = actionsBlock?.elements[0];
    const actionId: string | undefined =
      firstElement && 'action_id' in firstElement ? firstElement.action_id : undefined;
    expect(actionId).toBeTypeOf('string');
    const payload: SlackInteractionPayload = {
      type: 'block_actions',
      actions: [{ type: 'button', action_id: actionId ?? '' }],
    };
    const { effects } = await surface.inbound('s1', payload);
    expect(effects).toEqual([
      { kind: 'fireAction', surfaceId: 's1', componentId: 'btn' },
    ]);
  });

  it('returns no effects for an unknown surface (empty registry, never throws)', async () => {
    const surface = createSlackSurface();
    const payload: SlackInteractionPayload = {
      type: 'block_actions',
      actions: [{ type: 'button', action_id: 'UNKNOWN' }],
    };
    expect((await surface.inbound('never-rendered', payload)).effects).toEqual([]);
  });
});

describe('createSlackSurface with custom components', () => {
  const approvalCard: CustomComponent = {
    name: 'ApprovalCard',
    schema: z.object({
      title: z.unknown().optional(),
      onApprove: z.unknown().optional(),
      comment: z.unknown().optional(),
    }),
    actions: ['onApprove'],
    inputs: { comment: { extract: () => 'EXTRACTED' } },
    render: (props, ctx) => [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `Approve ${String(props['title'])}?` },
      },
      {
        type: 'input',
        block_id: 'note',
        label: { type: 'plain_text', text: 'Comment' },
        element: { type: 'plain_text_input', action_id: ctx.input('comment') },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: ctx.action('onApprove'),
            text: { type: 'plain_text', text: 'OK' },
          },
        ],
      },
    ],
  };

  const customMessages: A2uiMessage[] = [
    { version: 'v0.9', createSurface: { surfaceId: 'cc', catalogId: 'a2ui-slack' } },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'cc',
        components: [
          {
            component: 'ApprovalCard',
            id: 'root',
            title: 'Deploy',
            onApprove: { event: { name: 'deploy' } },
            comment: { path: '/note' },
          },
        ],
      },
    },
  ];

  it('renders a registered custom component end-to-end (not the unsupported fallback)', async () => {
    const surface = createSlackSurface({ customComponents: [approvalCard] });
    const { blocks, degradations } = await surface.render('cc', customMessages);
    expect(JSON.stringify(blocks)).toContain('Approve Deploy?');
    expect(JSON.stringify(blocks)).not.toContain('unsupported component');
    expect(degradations).toEqual([]); // comment is {path:'/note'} → real write-back, no degradation
  });

  it('advertises registered custom components in capabilities', () => {
    const surface = createSlackSurface({ customComponents: [approvalCard] });
    expect(JSON.stringify(surface.capabilities)).toContain('ApprovalCard');
  });

  it('advertises capabilities under the configured catalogId, not the default', () => {
    const surface = createSlackSurface({ catalogId: 'custom-cat' });
    expect(surface.capabilities['v0.9'].supportedCatalogIds).toContain('custom-cat');
    expect(surface.capabilities['v0.9'].inlineCatalogs?.[0]?.catalogId).toBe(
      'custom-cat',
    );
  });

  it('runs the per-param extractor on the inbound path', async () => {
    const surface = createSlackSurface({ customComponents: [approvalCard] });
    const { blocks } = await surface.render('cc', customMessages);
    const inputBlock = blocks.find((b): b is InputBlock => b.type === 'input');
    const actionId =
      inputBlock && 'action_id' in inputBlock.element
        ? inputBlock.element.action_id
        : undefined;
    expect(actionId).toBeTypeOf('string');
    const payload: SlackInteractionPayload = {
      type: 'block_actions',
      actions: [
        { type: 'plain_text_input', action_id: actionId ?? '', value: 'raw typed' },
      ],
    };
    const { effects } = await surface.inbound('cc', payload);
    expect(effects).toEqual([
      { kind: 'setData', surfaceId: 'cc', path: '/note', value: 'EXTRACTED' },
    ]);
  });

  it('throws at construction on a reserved custom component name', () => {
    const clash: CustomComponent = { ...approvalCard, name: 'Button' };
    expect(() => createSlackSurface({ customComponents: [clash] })).toThrow(
      /built-in|reserved|Button/i,
    );
  });

  it('surfaces a throwing custom extractor as a diagnostic through inbound()', async () => {
    const widget: CustomComponent = {
      name: 'Widget',
      schema: z.object({ val: z.object({ path: z.string() }) }),
      inputs: {
        val: {
          extract: () => {
            throw new Error('boom');
          },
        },
      },
      render: (_p, c) => [
        {
          type: 'input',
          block_id: 'w-val',
          label: { type: 'plain_text', text: 'Val' },
          element: { type: 'plain_text_input', action_id: c.input('val') },
        },
      ],
    };
    const surface = createSlackSurface({ customComponents: [widget] });
    const widgetMessages: A2uiMessage[] = [
      { version: 'v0.9', createSurface: { surfaceId: 'w1', catalogId: 'a2ui-slack' } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'w1',
          components: [
            {
              component: 'Widget',
              id: 'root',
              val: { path: '/v' },
            },
          ],
        },
      },
    ];
    const { blocks } = await surface.render('w1', widgetMessages);
    const inputBlock = blocks.find((b): b is InputBlock => b.type === 'input');
    const actionId =
      inputBlock && 'action_id' in inputBlock.element
        ? inputBlock.element.action_id
        : undefined;
    expect(actionId).toBeTypeOf('string');
    const payload: SlackInteractionPayload = {
      type: 'block_actions',
      actions: [
        { type: 'plain_text_input', action_id: actionId ?? '', value: 'user input' },
      ],
    };
    const result = await surface.inbound('w1', payload);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      kind: 'extractorThrew',
      surfaceId: 'w1',
      componentId: 'root',
      custom: { component: 'Widget', param: 'val' },
    });
  });
});
