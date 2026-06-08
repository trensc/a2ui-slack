import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import type { A2uiMessage, ComponentApi } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import { emptyRegistry } from '../action-id/action-id.js';
import { interpretPayload } from '../actions/interpret-payload.js';
import type { SlackInteractionPayload } from '../actions/interpret-payload.js';
import type { InboundEffect } from '../actions/inbound-effect.js';
import { assembleSurface } from '../surface/assemble-surface.js';
import type { AssembledSurface } from '../surface/assemble-surface.js';
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
}

/** The stateful host facade returned by [[createSlackSurface]]. */
export interface SlackSurface {
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
 * Transport (posting blocks, receiving payloads) stays the consumer's job.
 */
export function createSlackSurface(options: SlackSurfaceOptions = {}): SlackSurface {
  const store = options.store ?? new InMemoryRegistryStore();
  const catalogId = options.catalogId ?? 'a2ui-slack';
  const keyPrefix = options.keyPrefix ?? '';
  const processor = new MessageProcessor<ComponentApi>([
    new Catalog<ComponentApi>(catalogId, BASIC_COMPONENTS),
  ]);
  const keyFor = (surfaceId: string): string => `${keyPrefix}${surfaceId}`;

  return {
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
        tree: resolveSurface(surface),
        surfaceId,
        surfaceKind,
        registry,
      });
      await store.set(keyFor(surfaceId), assembled.registry);
      return assembled;
    },

    async inbound(surfaceId, payload) {
      const registry = (await store.get(keyFor(surfaceId))) ?? emptyRegistry;
      return interpretPayload(payload, registry);
    },
  };
}
