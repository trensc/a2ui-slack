# Contributing to a2ui-slack

Thanks for your interest. This is a decoupled A2UI → Slack Block Kit renderer
held to a strict quality gate: a pure core (data in, data out) plus a thin
stateful facade in `src/host/` — stateful, but still I/O-free. Contributions are
welcome as long as they clear that gate.

## Prerequisites

- Node.js `>=20`

## Install

```bash
npm install
```

## Dev loop

The renderer is built component-by-component, TDD-first:

1. Write a failing test (and a golden fixture under `test/fixtures/` where the
   change affects rendered output).
2. Write the minimal pure renderer that satisfies it.
3. Run the gate and iterate until green.

```bash
npm test            # run the suite
npm run test:watch  # watch mode
npm run coverage    # with coverage
npm run build       # emit dist/
```

## Quality gate

Every change must pass the full gate before it can merge:

```bash
npm run verify      # lint + format + typecheck + coverage
npm test            # full suite
npm run conformance # golden fixtures: every A2UI component → Block Kit
npm run mutation    # StrykerJS mutation testing
```

| Gate        | Threshold                                                    |
| ----------- | ------------------------------------------------------------ |
| Lint        | 0 errors; functions ≤ 60 lines; no backend imports in `src/` |
| Format      | clean                                                        |
| Types       | 0 errors (strict)                                            |
| Coverage    | 100% lines / branches / functions                            |
| Mutation    | ≥ 90%                                                        |
| Conformance | every A2UI component type covered                            |

## Conventions

The rigid conventions are enforced in review. The essentials:

- **Purity.** Nothing in `src/` may import a backend, transport, or runtime I/O
  (no Slack Web API client, no CRM, no message bus, no env/fs/network). Backend
  coupling lives in `examples/`, never in the core.
- **Function size.** Functions stay ≤ 60 lines.
- **Colocated tests.** Unit tests sit next to the code they cover.
- **One module per component.** Each A2UI component gets exactly one component
  module that maps it to Block Kit.

Target the **A2UI spec v0.9** via `@a2ui/web_core/v0_9`.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages (e.g. `feat(components): add Slider renderer`).
- Generated code is fully accepted, as long as the author has cleared every
  gate, understands what the change does, and has verified it runs end-to-end.
- PRs must pass the full quality gate.
