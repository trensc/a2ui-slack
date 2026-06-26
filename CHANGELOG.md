# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Custom components** - register integrator-defined components that render to
  Block Kit: `buildCustomRegistry`, `toComponentApi`, the `CustomComponent` /
  `CustomComponentContext` / `CustomInputSpec` contract, and a `customComponents`
  option on `createSlackSurface`. Registered components join the inline catalog
  (so web_core accepts the agent's messages), resolve and render through the
  custom pipeline, expose per-param `action`/`input` callbacks, run per-param
  inbound extractors, and are advertised via `SlackSurface.capabilities`.
- **Schema-authoring re-exports** - `z`, `DynamicStringSchema` and `ActionSchema`
  are re-exported from the package root so custom-component prop schemas can be
  built from a single import, against the same zod instance web_core validates with.

### Changed

- **Inbound decode retourne un résultat structuré** - `interpretPayload` et
  `SlackSurface.inbound` retournent désormais `InboundResult { effects, diagnostics }`
  au lieu d'un `InboundEffect[]`, en miroir de `RenderResult { blocks, degradations }`.
  Le champ `diagnostics` signale un extracteur custom qui a throw (auparavant
  silencieusement avalé). Migration : lire `.effects` (ex. `const { effects } = await
surface.inbound(id, payload)`). BREAKING (pré-1.0).

### Fixed

- **Capabilities catalog id** - `createSlackSurface` advertised capabilities under
  the hardcoded `a2ui-slack` id even when `catalogId` was overridden, so the
  agent's messages targeted an id the processor never registered. Capabilities
  are now derived from the configured processor, and `buildCapabilities` /
  `capabilitiesFromCatalog` accept an optional `catalogId`.
- **Inbound extractor isolation** - a custom input extractor that threw propagated
  out of `inbound()` and dropped every effect of the payload; it is now sandboxed
  and defers to the built-in extractor on error.
- **Custom action shape** - custom action props are now resolved from the A2UI
  v0.9 `{event:{name}}` Action shape (previously a non-conformant `{action:string}`
  was expected, so spec-conformant actions silently produced dead callbacks); a
  `{functionCall}` or value-less action records a `partial` degradation instead of
  wiring a disambiguator-less callback.

## [0.1.0]

Initial renderer foundation targeting A2UI spec v0.9.

### Added

- **Component renderers** - A2UI component → Block Kit mapping, one module per
  component: Text, Image, Icon, Video, AudioPlayer, Divider, Row, Column, List,
  Card, Tabs, Modal, Button, TextField, CheckBox, ChoicePicker, Slider,
  DateTimeInput. Exhaustive component dispatch with a fallback helper.
- **Stateful host facade** - `a2ui-slack/host` subpath: `createSlackSurface`
  (render + inbound in one object) and a `RegistryStore` port with an
  `InMemoryRegistryStore` default for pluggable persistence.
- **Surface assembly** - `resolveSurface` (web_core binder), `resolveTree`,
  `assembleSurface` (resolved tree → Block Kit blocks), and `buildCapabilities`
  (reduced v0.9 catalog, omits Modal).
- **Slack limit clamping** - pure helpers that clamp blocks, fields, options,
  text, and elements to Slack's hard limits at the render edge.
- **action_id codec** - encode/decode of `action_id` references with a token
  registry; `surfaceId` injected via render context.
- **Inbound payload interpretation** - `interpretPayload` maps a Slack
  interaction payload to `InboundEffect[]`.
- **Flush scheduler** - batches and schedules surface updates.
- **Public API barrel** and shared contract types.

[Unreleased]: https://github.com/trensc/a2ui-slack/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/trensc/a2ui-slack/releases/tag/v0.1.0
