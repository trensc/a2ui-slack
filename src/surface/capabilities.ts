import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import type { A2uiClientCapabilities } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import type { CustomComponent } from '../components/custom/custom-component.js';
import { toComponentApi } from '../components/custom/custom-component.js';

/** Catalog id advertised to the agent for the reduced Slack-supported set. */
export const SLACK_CATALOG_ID = 'a2ui-slack';

/**
 * Components from the v0.9 basic catalog that this renderer cannot honour on
 * Slack and therefore must NOT advertise — so a well-behaved agent never emits
 * them. `Modal` has no message-surface equivalent (V2, view-only).
 */
export const OMITTED_COMPONENTS: readonly string[] = ['Modal'];

/**
 * Build the v0.9 `a2uiClientCapabilities` advertising a REDUCED inline catalog:
 * the basic catalog minus the components Slack can't render ([[OMITTED_COMPONENTS]]),
 * plus any registered custom components projected via {@link toComponentApi} so the
 * agent sees them as first-class catalog entries.
 * Pure & deterministic — it spins up a throwaway `MessageProcessor` purely to reuse
 * web_core's schema→JSON-Schema conversion, holds no module state, and never does I/O.
 */
export function buildCapabilities(
  customComponents: readonly CustomComponent[] = [],
): A2uiClientCapabilities {
  const omitted = new Set(OMITTED_COMPONENTS);
  const components = [
    ...BASIC_COMPONENTS.filter((c) => !omitted.has(c.name)),
    ...customComponents.map(toComponentApi),
  ];
  const catalog = new Catalog(SLACK_CATALOG_ID, components);
  const processor = new MessageProcessor([catalog]);
  return processor.getClientCapabilities({ includeInlineCatalogs: true });
}
