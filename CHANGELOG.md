# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

Initial renderer foundation targeting A2UI spec v0.9.

### Added

- **Component renderers** - A2UI component → Block Kit mapping, one module per
  component: Text, Image, Icon, Video, AudioPlayer, Divider, Row, Column, List,
  Card, Tabs, Modal, Button, TextField, CheckBox, ChoicePicker, Slider,
  DateTimeInput. Exhaustive component dispatch with a fallback helper.
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
