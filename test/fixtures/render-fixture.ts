import { Catalog, MessageProcessor, type SurfaceModel } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import {
  assembleSurface,
  emptyRegistry,
  resolveSurface,
  type AssembledSurface,
  type ResolvedComponent,
  type SurfaceKind,
} from '../../src/index.js';

/** A raw A2UI component as it arrives in an `updateComponents` message. */
export type RawComponent = Record<string, unknown> & {
  readonly id: string;
  readonly component: string;
};

/**
 * Build a real web_core {@link SurfaceModel} from a data model + raw components,
 * mirroring how a host feeds A2UI messages in: create the surface, seed the data
 * model at root, then register the components. Throws if the surface is missing
 * (a malformed fixture should fail loudly, not render blank).
 */
export function buildSurface(
  dataModel: unknown,
  components: readonly RawComponent[],
): SurfaceModel {
  const processor = new MessageProcessor([new Catalog('basic', BASIC_COMPONENTS)]);
  processor.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'basic' } },
    { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: dataModel } },
    {
      version: 'v0.9',
      updateComponents: { surfaceId: 's', components: [...components] },
    },
  ]);
  const surface = processor.model.getSurface('s');
  if (surface === undefined) throw new Error('fixture surface was not created');
  return surface;
}

/** Run the full golden pipeline: A2UI messages → resolved tree → Block Kit. */
export function renderFixture(
  dataModel: unknown,
  components: readonly RawComponent[],
  surfaceKind: SurfaceKind,
): AssembledSurface {
  const tree = resolveSurface(buildSurface(dataModel, components));
  return assembleSurface({
    tree,
    surfaceId: 'surface',
    surfaceKind,
    registry: emptyRegistry,
  });
}

/** The distinct resolved component types a fixture actually produces. */
export function resolvedTypes(
  dataModel: unknown,
  components: readonly RawComponent[],
): ReadonlySet<ResolvedComponent['type']> {
  const tree = resolveSurface(buildSurface(dataModel, components));
  return new Set([...tree.byId.values()].map((node) => node.type));
}

/** Every component type the basic catalog defines (the conformance target set). */
export const BASIC_COMPONENT_TYPES: readonly string[] = BASIC_COMPONENTS.map(
  (component) => component.name,
);
