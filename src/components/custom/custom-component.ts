import type { KnownBlock } from '@slack/types';
import type { z } from 'zod';
import type { ComponentApi } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import type { SurfaceKind } from '../../surface/surface-target.js';
import type { JsonValue } from '../../actions/inbound-effect.js';
import type { InboundElement } from '../../actions/interpret-payload.js';

export interface CustomComponentContext {
  readonly id: string;
  readonly surfaceKind: SurfaceKind;
  readonly action: (paramName: string) => string;
  readonly input: (paramName: string) => string;
}

export interface CustomInputSpec {
  readonly extract?: (element: InboundElement) => JsonValue;
}

export interface CustomComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly name: string;
  readonly schema: z.ZodObject<z.ZodRawShape>;
  readonly actions?: readonly string[];
  readonly inputs?: Readonly<Record<string, CustomInputSpec>>;
  readonly render: (props: P, ctx: CustomComponentContext) => readonly KnownBlock[];
}

export type CustomComponentRegistry = ReadonlyMap<string, CustomComponent>;

/**
 * Every built-in component name is reserved — a custom component may not shadow one,
 * including `Modal`, which the renderer still renders even though capabilities omits it.
 */
const RESERVED: ReadonlySet<string> = new Set(
  BASIC_COMPONENTS.map((component) => component.name),
);

/** Build the name→component lookup, rejecting duplicate, reserved, and unschema'd markers at startup. */
export function buildCustomRegistry(
  components: readonly CustomComponent[],
): CustomComponentRegistry {
  const map = new Map<string, CustomComponent>();
  for (const component of components) {
    if (RESERVED.has(component.name)) {
      throw new Error(
        `buildCustomRegistry: "${component.name}" is a reserved built-in component name.`,
      );
    }
    if (map.has(component.name)) {
      throw new Error(
        `buildCustomRegistry: duplicate custom component name "${component.name}".`,
      );
    }
    assertMarkersInSchema(component);
    map.set(component.name, component);
  }
  return map;
}

/** Every action/input marker must name a real prop in the Zod schema — catches typo'd dead callbacks. */
function assertMarkersInSchema(component: CustomComponent): void {
  // `.shape` exists only on a bare ZodObject; a `.refine()`/`.transform()` schema is a
  // ZodEffects with no `.shape`, which the typed field nominally forbids but `as` can bypass.
  const shape: unknown = component.schema.shape;
  if (typeof shape !== 'object' || shape === null) {
    throw new Error(
      `buildCustomRegistry: "${component.name}".schema must be a bare z.object (no .refine/.transform wrapper).`,
    );
  }
  const props = new Set(Object.keys(shape));
  const markers = [...(component.actions ?? []), ...Object.keys(component.inputs ?? {})];
  for (const marker of markers) {
    if (!props.has(marker)) {
      throw new Error(
        `buildCustomRegistry: "${component.name}" marks "${marker}" as a callback, ` +
          `but it is not a key in the schema.`,
      );
    }
  }
}

/** Project a custom component into the web_core ComponentApi the Catalog consumes. Internal — not re-exported. */
export function toComponentApi(component: CustomComponent): ComponentApi {
  return { name: component.name, schema: component.schema };
}
