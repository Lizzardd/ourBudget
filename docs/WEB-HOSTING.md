# Web hosting — Cloudflare Pages

The web app is a static export (`expo export -p web` → `dist/`) with no server of
its own; Convex is the backend. It's hosted free on **Cloudflare Pages**, live at
**https://ob.lizzardd.link**.

## Current setup (already done)

| | |
|---|---|
| Cloudflare account | `D.lizzardd+cf@gmail.com` (account `84b55cfea109ea20095e6675451e644d`) |
| Pages project | `ourbudget` → `ourbudget.pages.dev` |
| Custom domain | `ob.lizzardd.link` — active, HTTPS issued |
| DNS | AWS Route 53, zone `Z01277391AGS40ANTHVP9`: `CNAME ob.lizzardd.link → ourbudget.pages.dev` |
| Auth | prod Convex `SITE_URL = https://ob.lizzardd.link` (so Google sign-in returns here) |

Builds are done locally and the built `dist/` is pushed — the same pattern as the
sideloaded APK. Cloudflare is **not** wired to build from the repo, deliberately:
`.env.local` is gitignored, so a repo-side build would have no
`EXPO_PUBLIC_CONVEX_URL` and render a backend-less app. `web:build:prod` pins the
prod URL inline so the build is correct regardless of `.env.local`.

## Deploy (routine)

```bash
pnpm web:deploy    # web:build:prod (pins prod) + wrangler pages deploy dist
```

Live in seconds. A one-time `npx wrangler login` is needed per machine.

## Verify before trusting a deploy

- Correct backend baked in (prod, not dev):

  ```bash
  grep -ro "shiny-scorpion-150\|glorious-panda-32" dist/_expo/static/js/web/*.js
  ```

  Expect `shiny-scorpion-150`, and **no** `glorious-panda-32`.

- Load https://ob.lizzardd.link, sign in with Google, and refresh on a tab
  (`/home`) — it should stay put, not blank (the `(app)` auth gate handles this).

## Redoing the setup from scratch

If the project/domain ever needs recreating:

1. `npx convex env set SITE_URL https://ob.lizzardd.link --prod` — makes Google
   sign-in redirect back here (without it: "Invalid redirectTo"). Google Cloud
   needs no change — it always calls back to Convex's `.site` URL.
2. `npx wrangler login`, then `pnpm web:deploy` — first run creates the `ourbudget`
   Pages project.
3. Add the custom domain on the Pages project (dashboard, or the Cloudflare API).
   Cloudflare returns a CNAME target (`ourbudget.pages.dev`).
4. In Route 53 (zone `Z01277391AGS40ANTHVP9`) add
   `CNAME ob.lizzardd.link → ourbudget.pages.dev`. Cloudflare then validates and
   issues the cert automatically (a few minutes).

## Notes

- **No OTA, no server rebuild.** Updating the web app = `pnpm web:deploy` from your
  machine. Same mental model as the APK.
- **Changing the domain** means re-running step 1 (new `SITE_URL`) and the custom
  domain + DNS. `SITE_URL` must always equal the site's origin.
- The Google OAuth consent screen still shows `shiny-scorpion-150.convex.site`
  ("continue to …"). Set an **App name** ("Our Budget") + logo on the Google
  OAuth consent screen to show a friendly name instead. Hiding the domain entirely
  needs a custom Convex domain (paid); the app-name route is free.
- Free tier: unlimited bandwidth, plenty of deploys — no cost for a home app.
