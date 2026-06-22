import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import type { A2uiClientCapabilities, ComponentApi } from '@a2ui/web_core/v0_9';
import { BASIC_COMPONENTS } from '@a2ui/web_core/v0_9/basic_catalog';
import type {
  CustomComponent,
  CustomComponentRegistry,
} from '../components/custom/custom-component.js';
import {
  buildCustomRegistry,
  toComponentApi,
} from '../components/custom/custom-component.js';

/** Catalog id advertised to the agent for the reduced Slack-supported set. */
export const SLACK_CATALOG_ID = 'a2ui-slack';

/**
 * Components from the v0.9 basic catalog that this renderer cannot honour on
 * Slack and therefore must NOT advertise — so a well-behaved agent never emits
 * them. `Modal` has no message-surface equivalent (V2, view-only).
 */
export const OMITTED_COMPONENTS: readonly string[] = ['Modal'];

/**
 * The component set that backs the Slack catalog: the basic catalog minus the
 * components Slack can't render ([[OMITTED_COMPONENTS]]), plus every registered
 * custom component projected via {@link toComponentApi}. Shared by capability
 * advertisement and by the host's `MessageProcessor`, so the catalog the agent
 * is told about and the catalog used to validate its messages never diverge.
 */
export function slackCatalogComponents(custom: CustomComponentRegistry): ComponentApi[] {
  const omitted = new Set(OMITTED_COMPONENTS);
  return [
    ...BASIC_COMPONENTS.filter((c) => !omitted.has(c.name)),
    ...[...custom.values()].map((registered) => toComponentApi(registered.component)),
  ];
}

/**
 * Build the v0.9 `a2uiClientCapabilities` advertising a REDUCED inline catalog
 * (see {@link slackCatalogComponents}). Custom components are validated through
 * {@link buildCustomRegistry} first, so a reserved/duplicate name fails here with
 * an actionable error rather than producing an ambiguous catalog.
 * Pure & deterministic — it spins up a throwaway `MessageProcessor` purely to reuse
 * web_core's schema→JSON-Schema conversion, holds no module state, and never does I/O.
 */
export function buildCapabilities(
  customComponents: readonly CustomComponent[] = [],
): A2uiClientCapabilities {
  const registry = buildCustomRegistry(customComponents);
  const catalog = new Catalog(SLACK_CATALOG_ID, slackCatalogComponents(registry));
  const processor = new MessageProcessor([catalog]);
  return processor.getClientCapabilities({ includeInlineCatalogs: true });
}
