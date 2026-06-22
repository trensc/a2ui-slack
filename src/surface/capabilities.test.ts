import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ActionSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9';
import {
  OMITTED_COMPONENTS,
  SLACK_CATALOG_ID,
  buildCapabilities,
} from './capabilities.js';

describe('buildCapabilities', () => {
  it('advertises the reduced Slack catalog id under v0.9', () => {
    expect(SLACK_CATALOG_ID).toBe('a2ui-slack');
    const caps = buildCapabilities();
    expect(caps['v0.9'].supportedCatalogIds).toContain(SLACK_CATALOG_ID);
  });

  it('includes an inline catalog that omits Modal but keeps the basic components', () => {
    const caps = buildCapabilities();
    const inline = caps['v0.9'].inlineCatalogs?.find(
      (c) => c.catalogId === SLACK_CATALOG_ID,
    );
    if (inline?.components === undefined) throw new Error('expected inline components');
    const names = Object.keys(inline.components);
    expect(names).toContain('Text');
    expect(names).toContain('Button');
    for (const omitted of OMITTED_COMPONENTS) {
      expect(names).not.toContain(omitted);
    }
  });

  it('is deterministic (same capabilities object shape on repeated calls)', () => {
    expect(buildCapabilities()).toEqual(buildCapabilities());
  });

  it('advertises registered custom components inline alongside the basic catalog', () => {
    const caps = buildCapabilities([
      {
        name: 'ApprovalCard',
        schema: z.object({ title: DynamicStringSchema, onApprove: ActionSchema }),
        actions: ['onApprove'],
        render: () => [],
      },
    ]);
    const json = JSON.stringify(caps);
    expect(json).toContain('ApprovalCard'); // custom advertised
    expect(json).toContain('Button'); // basic catalog still present
    expect(json).not.toContain('Modal'); // omitted set still honored
  });

  it('rejects a custom component whose name collides with a built-in (validated like buildCustomRegistry)', () => {
    expect(() =>
      buildCapabilities([{ name: 'Button', schema: z.object({}), render: () => [] }]),
    ).toThrow(/built-in|reserved|Button/i);
  });

  it('rejects duplicate custom component names', () => {
    const dup = { name: 'Dup', schema: z.object({}), render: () => [] };
    expect(() => buildCapabilities([dup, dup])).toThrow(/duplicate.*Dup/i);
  });

  it('is unchanged when no custom components are passed', () => {
    expect(JSON.stringify(buildCapabilities())).toEqual(
      JSON.stringify(buildCapabilities([])),
    );
  });

  it('propagates Zod .describe() text into the inline catalog output', () => {
    const caps = buildCapabilities([
      {
        name: 'DescribeCard',
        schema: z.object({ title: DynamicStringSchema.describe('The card heading') }),
        render: () => [],
      },
    ]);
    const json = JSON.stringify(caps);
    // Zod .describe() sets the JSON Schema "description" field, which web_core's
    // schema-to-JSON-Schema conversion propagates into the inline catalog output
    // (same as the basic catalog's own field descriptions) — so integrators can use
    // .describe() to guide the agent.
    expect(json).toContain('The card heading');
  });
});
