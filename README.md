# a2ui-slack

A community [A2UI](https://github.com/google/A2UI) renderer for **Slack**. It maps
A2UI surfaces to [Slack Block Kit](https://api.slack.com/block-kit) so an agent that
speaks A2UI can render rich, interactive messages in Slack without knowing anything
about Slack itself.

> Status: early. The renderer is built component-by-component with a strict quality
> gate. See the roadmap below.

Targets **A2UI spec v0.9** via `@a2ui/web_core/v0_9` (and its `basic_catalog`). The
bare `@a2ui/web_core` entry resolves to the older v0_8 and is not used.

## Design

The core is **pure and decoupled**. `src/` takes A2UI messages in and returns Block
Kit out - no transport, no Slack client, no backend. Any integration that couples to
a backend (e.g. a LangGraph agent) lives in `examples/`, never in the core.

```
src/
  components/   one A2UI component → Block Kit mapping per file
  surface/      A2UI message processing (CreateSurface, UpdateComponents, …)
  actions/      Slack interaction payload → A2UI action (inbound)
  limits/       Slack limit clamping (pure helpers)
  index.ts      public API
test/fixtures/  golden A2UI messages + expected Block Kit
examples/       backend integrations (coupling lives here)
```

The core rule: nothing in `src/` may import a backend, a transport, or runtime I/O
(no CRM, no message bus, no Slack Web API client, no env/fs/network). Those live in
`examples/`.

## Quality bar

| Gate        | Tool                          | Threshold                                                    |
| ----------- | ----------------------------- | ------------------------------------------------------------ |
| Lint        | ESLint (strict, type-checked) | 0 errors; functions ≤ 60 lines; no backend imports in `src/` |
| Format      | Prettier                      | clean                                                        |
| Types       | `tsc` strict                  | 0 errors                                                     |
| Coverage    | Vitest + v8                   | 100% lines / branches / functions                            |
| Mutation    | StrykerJS                     | ≥ 90% (break)                                                |
| Conformance | golden fixtures               | every A2UI component type covered                            |

Run it all locally:

```bash
npm run verify     # lint + format + typecheck + coverage
npm run mutation   # mutation testing
```

## Development

```bash
npm install
npm test              # run the suite
npm run coverage      # with coverage
npm run build         # emit dist/
```

New components are built TDD-first: a failing golden-file test and fixture, then the
minimal pure renderer that satisfies it.

## Roadmap

1. **Renderer (unit / golden-file)** - build each A2UI component → Block Kit with
   100% coverage and mutation-tested assertions. No infra required.
2. **End-to-end** - adapter from a real LangGraph agent's events to A2UI, rendered
   into a live Slack workspace (shipped as an `examples/` integration).

## License

[MIT](LICENSE)
