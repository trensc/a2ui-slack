import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildCustomRegistry, toComponentApi } from './custom-component.js';
import type { CustomComponent } from './custom-component.js';

const card: CustomComponent = {
  name: 'ApprovalCard',
  schema: z.object({ title: z.string() }),
  render: () => [{ type: 'divider' }],
};

describe('buildCustomRegistry', () => {
  it('keys components by name', () => {
    const registry = buildCustomRegistry([card]);
    expect(registry.get('ApprovalCard')?.component).toBe(card);
    expect(registry.size).toBe(1);
  });

  it('precomputes the action/input marker lookup sets once', () => {
    const marked: CustomComponent = {
      name: 'Marked',
      schema: z.object({
        go: z.object({ action: z.string() }),
        note: z.object({ path: z.string() }),
      }),
      actions: ['go'],
      inputs: { note: {} },
      render: () => [],
    };
    const registered = buildCustomRegistry([marked]).get('Marked');
    expect([...(registered?.actionNames ?? [])]).toEqual(['go']);
    expect([...(registered?.inputNames ?? [])]).toEqual(['note']);
  });

  it('returns an empty registry for no components', () => {
    expect(buildCustomRegistry([]).size).toBe(0);
  });

  it('throws on duplicate custom names', () => {
    expect(() => buildCustomRegistry([card, card])).toThrow(/duplicate.*ApprovalCard/i);
  });

  it('throws when a name collides with a built-in component', () => {
    const clash: CustomComponent = { ...card, name: 'Button' };
    expect(() => buildCustomRegistry([clash])).toThrow(/built-in|reserved|Button/i);
  });

  it('throws when an action/input marker names a prop absent from the schema', () => {
    const typo: CustomComponent = {
      name: 'Typo',
      schema: z.object({ onApprove: z.object({ action: z.string() }) }),
      actions: ['onAprove'], // typo: not a key in schema.shape
      render: () => [],
    };
    expect(() => buildCustomRegistry([typo])).toThrow(/onAprove.*schema/i);
  });

  it('throws when the schema is not a bare z.object (e.g. .refine-wrapped)', () => {
    const refined: CustomComponent = {
      ...card,
      name: 'Refined',
      schema: z
        .object({ x: z.string() })
        .refine(() => true) as unknown as z.ZodObject<z.ZodRawShape>,
      actions: ['x'],
    };
    expect(() => buildCustomRegistry([refined])).toThrow(/bare z\.object/i);
  });
});

describe('toComponentApi', () => {
  it('projects name and schema', () => {
    expect(toComponentApi(card)).toEqual({ name: 'ApprovalCard', schema: card.schema });
  });
});
