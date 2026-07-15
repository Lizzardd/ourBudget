# Release & deployment

Builds and deploys are run **by hand, by the maintainer** — never automatically
by an agent. This is the runbook: what to run, in what order, and the ordering
rules that have bitten us.

## Where things run

| Piece | Where | Notes |
|---|---|---|
| **Backend (prod)** | Convex Cloud `shiny-scorpion-150` | Free tier. `SITE_URL = https://ob.lizzardd.link`. |
| **Backend (dev)** | Convex Cloud `glorious-panda-32` | What `convex dev` deploys to. |
| **Web** | Cloudflare Pages `ourbudget` → **https://ob.lizzardd.link** | Live. Account `D.lizzardd+cf@gmail.com`. See [WEB-HOSTING.md](WEB-HOSTING.md). |
| **Android** | Sideloaded APK | Built locally or via EAS. OTA is not currently relied on — see [OTA.md](OTA.md). |

`app.json` is at version **0.3.0**, `runtimeVersion **"3"**`.

## Before anything: local gates

```bash
pnpm exec tsc --noEmit      # types
pnpm exec vitest run        # 200+ unit tests over src/budget
pnpm exec expo export -p web # forces the tree to build & render
```

`tsc` + tests alone can pass while a component throws at render — the web export
is the cheapest thing that actually renders it. Run all three for anything that
touches components or startup.

## Deploy the backend

Only when `convex/` changed:

```bash
pnpm convex:deploy                 # interactive
pnpm exec convex deploy -y         # non-interactive
```

Verify what prod actually has: `npx convex function-spec --prod`.

## Deploy the web app

```bash
pnpm web:deploy    # web:build:prod (pins prod URL) + wrangler pages deploy dist
```

Full setup and the one-time custom-domain steps are in [WEB-HOSTING.md](WEB-HOSTING.md).

## Ship the Android app

Currently **sideloaded**, so there's no store/OTA step:

```bash
pnpm build:android          # EAS build (preview channel), or:
eas build --local           # build on your own machine (needs JDK + Android SDK)
```

Install the resulting APK on the phones.

- **EAS free-plan builds are capped per month.** A build was refused on
  2026-07-14 (quota exhausted, resets 2026-08-01). Options: wait, upgrade, or
  build locally.
- A **native change** (new native module, or a `runtimeVersion` bump) *requires*
  a build — an OTA cannot deliver it. `runtimeVersion` went `"2"` → `"3"` when
  `expo-file-system` was added.

## Rules that must hold

1. **Deploy Convex BEFORE shipping client code that calls a new function.** Not
   housekeeping — a hard dependency. Ship the client first and it calls a function
   the deployment lacks, throws, and (on native OTA) rolls back on every launch.
   This bricked v0.2.2. Verify with `npx convex function-spec --prod`.
2. **`SITE_URL` must equal the web app's origin.** Google sign-in redirects back
   to `SITE_URL`; if it doesn't match `https://ob.lizzardd.link`, web sign-in
   fails with "Invalid redirectTo". Set it with
   `npx convex env set SITE_URL https://ob.lizzardd.link --prod`.
3. **Only bump `runtimeVersion` when the native layer changes** — which is exactly
   when a rebuild is needed anyway. Bumping it orphans every OTA published against
   the old runtime.
4. **Web deploys ship a locally-built `dist/`, not a repo-side CI build.**
   `.env.local` is gitignored, so a CI build would have no backend URL.
   `web:build:prod` pins the prod URL inline so the build is correct regardless.

## OTA (over-the-air updates)

Not currently the delivery mechanism — the Android app is sideloaded. The full
history, the root cause, and the crash recorder built to diagnose it are in
[OTA.md](OTA.md). If OTA is revived: **build first (new runtime), then publish
updates against it; deploy Convex before any update that needs it.**
