import { describe, expect, it } from 'vitest';
import {
  OMITTED_COMPONENTS,
  SLACK_CATALOG_ID,
  buildCapabilities,
} from './capabilities.js';

describe('buildCapabilities', () => {
  it('advertises the reduced Slack catalog id under v0.9', () => {
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
});
