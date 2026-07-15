# Our Budget

A shared-household budgeting app — one household, several members, one set of
live figures for everyone. Add an expense on any device and everyone sees it
instantly.

- **Native:** Android (sideloaded APK)
- **Web:** https://ob.lizzardd.link
- **Backend:** Convex (real-time), Google sign-in

Built with Expo (SDK 57) / React Native, `expo-router`, and Convex, from a single
codebase that targets native and web.

## Quickstart

Uses **pnpm** and the Node version in `.nvmrc`.

```bash
pnpm install
pnpm web            # local web dev server, hot reload (targets the backend in .env.local)
pnpm android        # run on a connected Android device / emulator
```

`.env.local` sets which Convex backend the client talks to (currently **prod**,
so you develop against real data — there's a note in the file on switching to the
dev backend).

Common scripts (`pnpm run <name>`; each has a one-line description in
`package.json`'s `scriptsInfo`):

| Script | Does |
|---|---|
| `web` / `android` / `ios` | Local dev servers |
| `test` / `typecheck` | `vitest run` / `tsc --noEmit` |
| `convex` / `convex:deploy` | Convex dev backend watch / deploy to prod |
| `web:build:prod` / `web:deploy` | Build the web app / build + publish to Cloudflare Pages |
| `build:android` / `update:android` | EAS build / publish an OTA update |

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — stack, layout, and the
  conventions that are easy to get wrong. Start here.
- **[docs/RELEASE.md](docs/RELEASE.md)** — how to build, deploy, and ship.
- **[docs/WEB-HOSTING.md](docs/WEB-HOSTING.md)** — the Cloudflare Pages setup.
- **[docs/OTA.md](docs/OTA.md)** — over-the-air update post-mortem.
- **[docs/DEVIATIONS.md](docs/DEVIATIONS.md)** — where we depart from the prototype.
- **[TODO.md](TODO.md)** — open work.
- **[CLAUDE.md](CLAUDE.md)** — guide for AI agents working in this repo.

The UI is designed in a claude.ai/design prototype saved at
`docs/design/BudgetApp-Prototype.dc.html`, which is the source of truth for what
the UI looks like. Sync it with the `/prototype-sync` skill.

## Tests

```bash
pnpm exec vitest run     # unit tests over the pure budget logic (src/budget)
pnpm exec tsc --noEmit   # types
```
