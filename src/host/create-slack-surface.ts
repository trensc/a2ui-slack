import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import type {
  A2uiClientCapabilities,
  A2uiMessage,
  ComponentApi,
} from '@a2ui/web_core/v0_9';
import { emptyRegistry } from '../action-id/action-id.js';
import { interpretPayload } from '../actions/interpret-payload.js';
import type { SlackInteractionPayload } from '../actions/interpret-payload.js';
import type { InboundEffect } from '../actions/inbound-effect.js';
import { buildCustomRegistry } from '../components/custom/custom-component.js';
import type { CustomComponent } from '../components/custom/custom-component.js';
import { assembleSurface } from '../surface/assemble-surface.js';
import type { AssembledSurface } from '../surface/assemble-surface.js';
import { SLACK_CATALOG_ID, slackCatalogComponents } from '../surface/capabilities.js';
import { resolveSurface } from '../surface/resolve-surface.js';
import type { SurfaceKind } from '../surface/surface-target.js';
import { InMemoryRegistryStore } from './in-memory-store.js';
import type { RegistryStore } from './registry-store.js';

/** Options for [[createSlackSurface]]; every field has a sensible default. */
export interface SlackSurfaceOptions {
  /** Registry persistence. Defaults to a process-local [[InMemoryRegistryStore]]. */
  readonly store?: RegistryStore;
  /** Catalog id the A2UI messages target. Defaults to `'a2ui-slack'`. */
  readonly catalogId?: string;
  /** Prefix prepended to every store key, e.g. a team id for multi-tenant stores. */
  readonly keyPrefix?: string;
  /**
   * Custom components to register. Their schemas join the catalog (so web_core
   * accepts the agent's messages), they resolve and render through the custom
   * pipeline, and their per-param extractors run on the inbound path. Validated
   * once at construction via [[buildCustomRegistry]] (throws on a reserved or
   * duplicate name). Also advertised to the agent via [[SlackSurface.capabilities]].
   */
  readonly customComponents?: readonly CustomComponent[];
}

/** The stateful host facade returned by [[createSlackSurface]]. */
export interface SlackSurface {
  /**
   * The v0.9 `a2uiClientCapabilities` to hand the agent — the reduced Slack
   * catalog plus the registered custom components. Stable for the facade's life.
   */
  readonly capabilities: A2uiClientCapabilities;
  /** Process `messages`, resolve `surfaceId`, and assemble Slack blocks. */
  render(
    surfaceId: string,
    messages: A2uiMessage[],
    surfaceKind?: SurfaceKind,
  ): Promise<AssembledSurface>;
  /** Decode a Slack interaction payload into pure [[InboundEffect]]s. */
  inbound(
    surfaceId: string,
    payload: SlackInteractionPayload,
  ): Promise<readonly InboundEffect[]>;
}

/**
 * Build a stateful Slack surface facade over the pure core. It owns one web_core
 * `MessageProcessor` and a [[RegistryStore]], threading the per-surface token
 * registry automatically so interactions decode correctly across re-renders.
 * Registered custom components are threaded through resolution, rendering, and the
 * inbound decode path. Transport (posting blocks, receiving payloads) stays the
 * consumer's job.
 */
export function createSlackSurface(options: SlackSurfaceOptions = {}): SlackSurface {
  const store = options.store ?? new InMemoryRegistryStore();
  const catalogId = options.catalogId ?? SLACK_CATALOG_ID;
  const keyPrefix = options.keyPrefix ?? '';
  const customRegistry = buildCustomRegistry(options.customComponents ?? []);
  const catalogComponents = slackCatalogComponents(customRegistry);
  const processor = new MessageProcessor<ComponentApi>([
    new Catalog<ComponentApi>(catalogId, catalogComponents),
  ]);
  const keyFor = (surfaceId: string): string => `${keyPrefix}${surfaceId}`;

  return {
    // Advertise the SAME processor/catalog the host validates against, so the
    // catalog id the agent is told about always matches the id its messages must
    // target — even when `catalogId` is overridden. (Also avoids spinning up a
    // second throwaway MessageProcessor just for capabilities.)
    capabilities: processor.getClientCapabilities({ includeInlineCatalogs: true }),

    async render(surfaceId, messages, surfaceKind = 'message') {
      processor.processMessages(messages);
      const surface = processor.model.getSurface(surfaceId);
      if (surface === undefined) {
        throw new Error(
          `createSlackSurface.render: surface "${surfaceId}" does not exist — ` +
            `process its createSurface message first.`,
        );
      }
      const registry = (await store.get(keyFor(surfaceId))) ?? emptyRegistry;
      const assembled = assembleSurface({
        tree: resolveSurface(surface, customRegistry),
        surfaceId,
        surfaceKind,
        registry,
        customComponents: customRegistry,
      });
      await store.set(keyFor(surfaceId), assembled.registry);
      return assembled;
    },

    async inbound(surfaceId, payload) {
      const registry = (await store.get(keyFor(surfaceId))) ?? emptyRegistry;
      return interpretPayload(payload, registry, customRegistry).effects;
    },
  };
}
