# Security Policy

## Supported versions

This project is pre-1.0 (`0.x`). Only the latest released version receives
security fixes.

| Version      | Supported |
| ------------ | --------- |
| latest `0.x` | yes       |
| older `0.x`  | no        |

## Reporting a vulnerability

Please report vulnerabilities privately. Do not open a public issue.

- Preferred: open a
  [private security advisory](https://github.com/trensc/a2ui-slack/security/advisories/new).
- Or email **clement.trens1@gmail.com**.

Response is best-effort - this is a community project. We'll acknowledge and
triage as time allows.

## Scope

a2ui-slack is a **rendering library that performs no I/O**: no network, no
filesystem, no transport, no auth, no secret handling. It produces Slack Block
Kit JSON from A2UI surfaces and parses Slack interaction payloads. The
`a2ui-slack/host` facade holds per-surface state, in memory by default; if you
plug in a custom `RegistryStore`, that store's I/O and its security are your
code and your responsibility.

Because of that, **consumers are responsible for transport, authentication, and
secret handling** - verifying Slack request signatures, managing tokens, and
securing any backend that wraps this library. Vulnerabilities in transport or
auth layers built around the renderer are out of scope; report those to the
relevant project.
