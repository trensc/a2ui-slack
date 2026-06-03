import { describe, expect, it } from 'vitest';
import type { KnownBlock } from '@slack/types';
import type { RenderResult } from '../../render-context.js';
import { clipFieldText, collapsibleFieldOf } from './two-up-field.js';

const result = (blocks: readonly KnownBlock[]): RenderResult => ({
  blocks,
  degradations: [],
});

describe('collapsibleFieldOf', () => {
  it('returns the text object of a lone simple section', () => {
    const field = collapsibleFieldOf(
      result([{ type: 'section', text: { type: 'mrkdwn', text: 'k: v' } }]),
    );
    expect(field).toEqual({ type: 'mrkdwn', text: 'k: v' });
  });

  it('rejects results with not exactly one block', () => {
    expect(collapsibleFieldOf(result([]))).toBeUndefined();
    expect(
      collapsibleFieldOf(
        result([
          { type: 'section', text: { type: 'mrkdwn', text: 'a' } },
          { type: 'divider' },
        ]),
      ),
    ).toBeUndefined();
  });

  it('rejects a non-section block', () => {
    expect(collapsibleFieldOf(result([{ type: 'divider' }]))).toBeUndefined();
  });

  it('rejects a section without text', () => {
    expect(
      collapsibleFieldOf(
        result([{ type: 'section', fields: [{ type: 'mrkdwn', text: 'x' }] }]),
      ),
    ).toBeUndefined();
  });

  it('rejects a section that already has fields', () => {
    expect(
      collapsibleFieldOf(
        result([
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 't' },
            fields: [{ type: 'mrkdwn', text: 'f' }],
          },
        ]),
      ),
    ).toBeUndefined();
  });

  it('rejects a section with an accessory', () => {
    expect(
      collapsibleFieldOf(
        result([
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 't' },
            accessory: { type: 'image', image_url: 'u', alt_text: 'a' },
          },
        ]),
      ),
    ).toBeUndefined();
  });

  it('clips field text to the 2000-char limit', () => {
    const long = 'x'.repeat(2500);
    const field = clipFieldText({ type: 'mrkdwn', text: long }, (t, m) =>
      t.length <= m ? t : `${t.slice(0, m - 1)}…`,
    );
    expect(field.text.length).toBe(2000);
    expect(field.type).toBe('mrkdwn');
  });
});
