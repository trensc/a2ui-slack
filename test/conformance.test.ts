import { describe, expect, it } from 'vitest';
import { FIXTURES } from './fixtures/cases.js';
import {
  BASIC_COMPONENT_TYPES,
  renderFixture,
  resolvedTypes,
} from './fixtures/render-fixture.js';
import { validateLimits } from './fixtures/validate-limits.js';

/** Catalog components resolveSurface never emits (rendered out-of-band, not in a tree). */
const SURFACE_LEVEL_ONLY = ['Modal'];

describe('conformance: golden fixtures', () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      it('renders without throwing and matches its Block Kit golden', () => {
        const result = renderFixture(
          fixture.dataModel,
          fixture.components,
          fixture.surfaceKind,
        );
        expect(result.blocks).toMatchSnapshot('blocks');
        expect(result.degradations).toMatchSnapshot('degradations');
        expect(result.notices).toMatchSnapshot('notices');
      });

      it('produces Block Kit within every Slack limit', () => {
        const result = renderFixture(
          fixture.dataModel,
          fixture.components,
          fixture.surfaceKind,
        );
        expect(validateLimits(result.blocks, fixture.surfaceKind)).toEqual([]);
      });

      it('actually exercises the component types it claims to cover', () => {
        const actual = resolvedTypes(fixture.dataModel, fixture.components);
        for (const type of fixture.covers) {
          expect(actual.has(type)).toBe(true);
        }
      });
    });
  }
});

describe('conformance: component-type coverage', () => {
  const covered = new Set<string>();
  for (const fixture of FIXTURES) {
    for (const type of resolvedTypes(fixture.dataModel, fixture.components)) {
      covered.add(type);
    }
  }

  it('covers every catalog component a surface can emit', () => {
    const missing = BASIC_COMPONENT_TYPES.filter(
      (type) => !covered.has(type) && !SURFACE_LEVEL_ONLY.includes(type),
    );
    expect(missing).toEqual([]);
  });

  it('leaves only the known surface-level components uncovered', () => {
    const uncovered = BASIC_COMPONENT_TYPES.filter((type) => !covered.has(type));
    expect(uncovered).toEqual(SURFACE_LEVEL_ONLY);
  });
});
