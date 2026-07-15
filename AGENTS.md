# Our Budget — agent guide

Shared-household budgeting app: Expo/React Native + Convex, running on native
(Android, sideloaded) and web (https://ob.lizzardd.link) from one codebase.

**[CLAUDE.md](CLAUDE.md) is the canonical agent guide** — read it and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching code.

The essentials:

- **The prototype is the source of truth for UI** (`docs/design/`,
  `/prototype-sync`). Don't invent UI it doesn't have; read the markup rather than
  eyeballing styling.
- **The maintainer runs all builds, deploys, OTA publishes, and Convex deploys.**
  Propose the exact commands; do not run them.
- **Verify before claiming done:** `pnpm exec tsc --noEmit`, `pnpm exec vitest run`,
  and `pnpm exec expo export -p web` for anything touching components or startup.
- **Money is integer minor units; months are 0-based** — both have caused real
  bugs. Native-only code must no-op on web (and vice-versa) via `*.native`/`*.web`
  files. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Open work is in [TODO.md](TODO.md); the doc index is [docs/README.md](docs/README.md).

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
