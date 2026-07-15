# Architecture

**Our Budget** (`ourbudget`) is a shared-household budgeting app. One household,
several members, one set of live figures for everyone.

## Stack

| Layer | Choice |
|---|---|
| App | Expo SDK 57, React Native 0.86, `expo-router` (file-based routes) |
| Backend | Convex `^1.42` — queries/mutations, real-time subscriptions, file storage |
| Auth | `@convex-dev/auth` `^0.0.94` with Google sign-in |
| Web | Static export (`expo export -p web`), hosted on Cloudflare Pages |
| Android | APK, sideloaded (built locally or via EAS) |
| Package manager | pnpm (Node 24, see `.nvmrc`) |

The app runs on **native (Android) and web from the same codebase**. iOS has
never been built (see [TODO.md](../TODO.md)).

## The prototype is the source of truth

The UI is designed in a claude.ai/design project and saved in-repo at
`docs/design/BudgetApp-Prototype.dc.html`. **The prototype decides what UI exists
and where** — not our judgement. Pull and apply changes with the
`/prototype-sync` skill (`.claude/skills/prototype-sync/`). Two recurring
failure modes it guards against: inventing UI the design never had, and
eyeballing styling instead of reading the markup. Deliberate departures from the
prototype are recorded in [DEVIATIONS.md](DEVIATIONS.md).

## Where things live

```
app/                     expo-router routes
  _layout.tsx            root: ConvexAuthProvider, ThemeProvider, error boundary
  index.tsx              auth gate → onboarding | consent | fork | app
  (onboarding)/          welcome, consent, fork, join, invite  (unauthenticated-safe)
  (app)/                 home, reports, settings, category/[id]  (gated: see below)
convex/                  backend
  schema.ts              tables + indexes
  auth.ts / auth.config.ts   Google OAuth + redirect allow-list
  transactions / categories / households / settings / consent / account
  http.ts                auth HTTP routes
src/
  budget/                PURE logic, fully unit-tested (money, detail, cards,
                         status, reports, periods, payees, newCategory)
  features/              app-wide sheets & providers (AddExpenseSheet, DateField…)
  components/            reusable UI (Sheet, Chip, Fab, TabBar, Icon…)
  hooks/                 useHousehold, useCategories, useAuth, useOtaUpdates…
  theme/                 tokens, fonts, ThemeProvider, useTheme
  diagnostics/           crashRecorder (native-only)
index.js / index.native.js   entry points (native imports InitializeCore first)
metro.config.js          pins InitializeCore first in the bundle — see docs/OTA.md
```

## Conventions and invariants

These are easy to get subtly wrong and expensive when you do.

- **Money is an integer in minor units** (fils / cents), never a float. Formatting
  lives in `src/budget/money.ts` and mirrors the prototype exactly: `glyph` +
  U+2009 thin space + two decimals with a **comma** decimal separator and **no
  thousands grouping** (`Đ 5500,00`, not `Đ 5,500.00`). `fmt` must not round —
  that silently drops cents. Grouping is done by hand because Hermes'
  `toLocaleString` formats against the device locale.

- **Months are 0-based.** `monthRange` uses `Date.UTC(year, month, 1)`, so July is
  `6`. Passing `getMonth() + 1` reads the *next* month — a valid, empty one — and
  silently reports zero. There's a regression test guarding this.

- **The design's demo data is not real logic.** The prototype ships fake people
  (`Sara`, `Omar`, "The Al-Marri Home") and mock arrays. Resolve people from real
  members (`useHouseholdMembers()`), never by hardcoded name. After a sync,
  `grep -rn "'Sara'\|'Omar'\|Al-Marri" src/ app/ convex/` — anything outside a
  test fixture is a bug.

- **Platform-split files** (`*.native.tsx` / `*.web.tsx`) let one platform use a
  native module the other can't. `DateField.web.tsx` uses `<input type="date">`
  because `@react-native-community/datetimepicker` has no web build;
  `index.native.js` imports `InitializeCore` first. Metro resolves the right file
  per platform automatically. Native-only code (e.g. `crashRecorder`, which uses
  `expo-file-system`) must no-op on web.

## Auth flow

`@convex-dev/auth` with a Google provider. The OAuth callback always lands on the
Convex deployment's `.site` URL; where the user is sent *afterwards* is governed
by `convex/auth.ts`'s `redirect` callback:

- **Native:** returns to the `ourbudget://` deep link.
- **Web:** the client sends its own origin as `redirectTo` (`useAuth.ts`), and the
  callback allows `localhost` (local dev) and any URL under `SITE_URL`. So
  **`SITE_URL` on the prod deployment must equal the web app's origin**
  (`https://ob.lizzardd.link`) or sign-in bounces to the wrong place.

The web build is a **static export** — every route is its own HTML file. Loading
an `(app)` route directly therefore bypasses `app/index.tsx`, so `(app)/_layout`
gates *itself* in `<Authenticated>`/`<AuthLoading>`/`<Unauthenticated>`;
otherwise a refresh on a tab runs `myHouseholds` unauthenticated and blanks. An
error boundary (`src/components/AppErrorBoundary.tsx`) wraps the tree so a thrown
query shows a recoverable screen instead of a white void.

## Related docs

- [RELEASE.md](RELEASE.md) — how to build, deploy, and ship (and the rules that must hold)
- [WEB-HOSTING.md](WEB-HOSTING.md) — the Cloudflare Pages setup
- [OTA.md](OTA.md) — the over-the-air update post-mortem and its lesson
- [DEVIATIONS.md](DEVIATIONS.md) — where and why we depart from the prototype
