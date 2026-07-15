# Our Budget — agent guide

Shared-household budgeting app: Expo/React Native + Convex, running on **native
(Android, sideloaded)** and **web (https://ob.lizzardd.link)** from one codebase.

## Read first

The details live in [docs/](docs/). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
before touching code — it covers the stack, layout, and the conventions that are
easy to get wrong.

| Doc | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, where things live, conventions & invariants, auth flow |
| [docs/RELEASE.md](docs/RELEASE.md) | Build / deploy / ship runbook + the rules that must hold |
| [docs/WEB-HOSTING.md](docs/WEB-HOSTING.md) | Cloudflare Pages setup |
| [docs/OTA.md](docs/OTA.md) | OTA post-mortem (OTA is not currently used) |
| [docs/DEVIATIONS.md](docs/DEVIATIONS.md) | Deliberate departures from the prototype |
| [TODO.md](TODO.md) | Open work |

## How to work here

- **The prototype is the source of truth for UI** (`docs/design/`,
  `/prototype-sync`). Don't invent UI it doesn't have; don't eyeball styling —
  read the markup.
- **The maintainer runs all builds, deploys, OTA publishes, and Convex deploys.**
  Propose the exact commands; do not run them.
- **Verify before claiming done:** `pnpm exec tsc --noEmit`, `pnpm exec vitest run`,
  and `pnpm exec expo export -p web` for anything touching components or startup
  (types + tests can pass while a component throws at render).
- **Money is integer minor units; months are 0-based.** These have caused real
  bugs — see the invariants in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Native-only code must no-op on web** (and vice-versa) via `*.native`/`*.web`
  files — e.g. the crash recorder and the date picker.

## Context-mode routing

The mandatory context-mode routing rules are inherited from the parent
`../CLAUDE.md`. In short: `curl`/`wget`/`WebFetch` are blocked — use
`ctx_fetch_and_index`; route any >20-line command through `ctx_execute` /
`ctx_batch_execute`; write artifacts to files rather than inline.

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the output verbatim |
| `ctx doctor` | Call `ctx_doctor`, run the returned command, show as a checklist |
| `ctx upgrade` | Call `ctx_upgrade`, run the returned command, show as a checklist |

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
