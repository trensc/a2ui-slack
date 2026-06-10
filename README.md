# a2ui-slack

[![npm](https://img.shields.io/npm/v/a2ui-slack)](https://www.npmjs.com/package/a2ui-slack)
[![CI](https://github.com/trensc/a2ui-slack/actions/workflows/ci.yml/badge.svg)](https://github.com/trensc/a2ui-slack/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/trensc/a2ui-slack/badge)](https://scorecard.dev/viewer/?uri=github.com/trensc/a2ui-slack)
[![npm downloads](https://img.shields.io/npm/dm/a2ui-slack)](https://www.npmjs.com/package/a2ui-slack)
![node](https://img.shields.io/node/v/a2ui-slack)

> Render [A2UI](https://github.com/google/A2UI) surfaces as native [Slack Block Kit](https://api.slack.com/block-kit).

Your agent already speaks A2UI — a declarative, framework-agnostic UI protocol. `a2ui-slack` turns those surfaces into rich, interactive Slack messages, so **your agent never has to learn Block Kit**.

```
   ┌──────────┐   A2UI messages    ┌─────────────┐   Block Kit    ┌────────┐
   │  Agent   │ ─────────────────► │ a2ui-slack  │ ─────────────► │ Slack  │
   │          │ ◄───────────────── │             │ ◄───────────── │        │
   └──────────┘   inbound effects  └─────────────┘   interactions └────────┘
```

You bring the transport (posting blocks, receiving interaction payloads). The library does the translation in both directions — including the bookkeeping that makes buttons and inputs map back to the right component across re-renders.

---

## Install

```bash
npm install a2ui-slack
```

Requires Node ≥ 20. Targets **A2UI spec v0.9**.

---

## Get started in 60 seconds

Your agent describes UI as A2UI messages. Hand them to a surface, get blocks back, post them. That's it.

```ts
import { createSlackSurface } from 'a2ui-slack/host';
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const surface = createSlackSurface();

// 1. The A2UI your agent emits. Components are a flat list referenced by id;
//    a value can be a literal or a binding into the data model ({ path: '…' }).
const surfaceId = 'ui_42';
const messages = [
  { version: 'v0.9', createSurface: { surfaceId, catalogId: 'a2ui-slack' } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['title', 'go'] },
        { id: 'title', component: 'Text', text: 'Deploy to production?', variant: 'h1' },
        {
          id: 'go',
          component: 'Button',
          child: 'go-label',
          action: { action: 'confirm' },
          variant: 'primary',
        },
        { id: 'go-label', component: 'Text', text: 'Ship it 🚀' },
      ],
    },
  },
];

// 2. Render to Block Kit.
const { blocks } = await surface.render(surfaceId, messages);

// 3. Post. You own the transport.
await slack.chat.postMessage({
  channel: 'C0123',
  text: 'Deploy to production?', // plain-text fallback for notifications
  blocks,
});
```

That's the whole render path. No Slack knowledge in your agent — it just emits A2UI.

---

## Make it interactive

When a user clicks a button or submits an input, Slack sends you an interaction payload. Hand it to the **same surface** and get back pure _effects_ — a description of what the interaction means in A2UI terms. You decide what to do with them.

```ts
// In your Slack action handler:
const effects = await surface.inbound(surfaceId, payload);

for (const effect of effects) {
  if (effect.kind === 'fireAction') {
    // The user triggered a component's action (e.g. clicked "confirm").
    // effect.componentId tells you which one → kick off your agent logic.
  }
  if (effect.kind === 'setData') {
    // An input changed a value (effect.path → effect.value).
    // Feed it back into your agent's data model.
  }
}
```

**Why a single `surface` object?** It remembers which `action_id` belongs to which component across re-renders. Slack's `action_id` strings are opaque and length-limited; the surface threads a registry under the hood so a click three renders later still resolves to the right component. You don't manage any of that.

---

## Configuration

`createSlackSurface()` works with zero config. Override only what you need:

```ts
const surface = createSlackSurface({
  // Persist the action_id registry across processes (defaults to in-memory).
  // Supply your own store (Redis, a DB row…) for multi-instance deployments.
  store: myRegistryStore,

  // Namespace store keys, e.g. per Slack team for multi-tenant bots.
  keyPrefix: 'T0ABCDE:',

  // Catalog id your A2UI messages target (defaults to 'a2ui-slack').
  catalogId: 'a2ui-slack',
});
```

A custom `store` implements two methods — `get(key)` and `set(key, registry)`:

```ts
import type { RegistryStore } from 'a2ui-slack/host';
```

> **Single process?** The default in-memory store is fine. Reach for a custom store only when interactions may be handled by a _different_ instance than the one that rendered.

---

## What renders

`a2ui-slack` covers the A2UI **basic catalog** — text, images, icons, buttons, inputs (text / checkbox / choice / slider / date-time), layout (row / column / list / card / tabs), and dividers. The one exception is `Modal`: it has no Slack message-surface equivalent, so the advertised catalog omits it and a well-behaved agent never emits it. Components Slack can't represent degrade gracefully rather than failing the whole message; `render()` returns `degradations` and `notices` if you want to inspect or log fidelity losses.

```ts
const { blocks, degradations, notices } = await surface.render(surfaceId, messages);
```

---

## Design philosophy

The library is two layers with a hard line between them:

- **`a2ui-slack`** — a **pure core**. A2UI messages in, Block Kit out. No transport, no Slack client, no I/O, no clock. Just data → data. Import it directly if you want the building blocks (`assembleSurface`, `renderComponent`, `interpretPayload`, …).
- **`a2ui-slack/host`** — a **thin stateful facade** (`createSlackSurface`) that owns one A2UI message processor and the registry store, so you don't have to wire them by hand. This is what most integrations use.

Transport always stays yours. The library never posts a message or opens a socket — that keeps it testable, portable across Slack SDKs, and impossible to couple to one backend.

---

## Quality bar

Every component is built TDD-first against golden fixtures and held to a strict gate:

| Gate        | Tool                          | Threshold                         |
| ----------- | ----------------------------- | --------------------------------- |
| Lint        | ESLint (strict, type-checked) | 0 errors; functions ≤ 60 lines    |
| Format      | Prettier                      | clean                             |
| Types       | `tsc` strict                  | 0 errors                          |
| Coverage    | Vitest + v8                   | 100% lines / branches / functions |
| Mutation    | StrykerJS                     | ≥ 90% (break)                     |
| Conformance | golden fixtures               | every A2UI component type covered |

```bash
npm run verify     # lint + format + typecheck + coverage
npm run mutation   # mutation testing
```

---

## Development

```bash
npm install
npm test           # run the suite
npm run coverage   # with coverage
npm run build      # emit dist/
```

New components are built TDD-first: a failing golden-file test and fixture, then the minimal pure renderer that satisfies it.

## Roadmap

1. **Renderer** — every basic-catalog component → Block Kit, mutation-tested. ✅ in progress
2. **End-to-end** — a real agent's events → A2UI → live Slack workspace, shipped as an example.
3. **Custom components** — register your own A2UI component types against the catalog (design phase).

## License

[MIT](LICENSE)
