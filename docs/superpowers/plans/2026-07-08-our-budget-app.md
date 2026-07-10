# Our Budget — Implementation Plan (Milestone 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full "Our Budget" prototype as an installable PWA (plus Android via Expo), backed by live Convex data and Google auth.

**Architecture:** One Expo (React Native + Expo Router) codebase renders to web/PWA and native. Convex holds households, categories and transactions and pushes realtime updates to every member. Pure TypeScript "budget math" (formatting, period-spend, status, report aggregation) lives in a shared module unit-tested in isolation; Convex query/mutation functions are tested with `convex-test`; screens consume Convex reactive queries and reproduce the prototype pixel-for-pixel.

**Tech Stack:** Expo SDK 52+, Expo Router, TypeScript (strict), react-native-web, `convex`, `@convex-dev/auth` (Google OAuth), `react-native-svg` (progress ring), `@expo-google-fonts/dm-sans`, `vitest` + `convex-test` (backend/logic tests), `@testing-library/react-native` (component logic).

**Source of truth for all UI:** [`docs/design/BudgetApp-Prototype.dc.html`](../../design/BudgetApp-Prototype.dc.html). When a task says "match the prototype", open that file and reproduce the referenced section (layout, spacing, colors, copy) exactly. The prototype's `<script>` `Component` class is the behavioral reference; its `renderVals()` maps 1:1 onto the derivations this plan specifies.

## Global Constraints

- **Coding style:** tabs (width 4) for indentation; YAML uses 2 spaces; no trailing whitespace; no whitespace on blank lines. (User global rule.)
- **Git:** never `git add`/`commit` unless the plan step is a commit step or the user asks. (User global rule.) Commit steps below are explicit.
- **Money:** store as integer minor units (fils). AED/USD/GBP/EUR ×100, ZAR ×100. Never use floats for stored amounts. Display divides by 100.
- **Currency glyphs:** `{ AED:'Đ', USD:'$', GBP:'£', EUR:'€', ZAR:'R' }`. Default household currency `AED`.
- **Accent color:** `#C96287`. Never hardcode elsewhere — read from theme.
- **Theme default:** `dark`. Both dark and light token sets are required (values in the spec + Task 5).
- **Font:** DM Sans everywhere.
- **Tone/copy:** reproduce the prototype's exact warm, encouraging strings (e.g. "… over — it happens 💛", "you've got this 🌿"). Copy is a requirement, not a suggestion.
- **No silent fallbacks:** every Convex mutation authorizes household membership and throws a clear error on failure (user rule [[no-silent-fallbacks]]).
- **Notifications/weekly check-in are in-app UI only** in M1 — driven by live data, no OS push / email.
- **Platform target:** must run as an installable PWA (web) AND on Android via Expo. Verify on web at minimum each phase.
- **Runtime:** Node **24** (pinned via `.nvmrc` = `24`, `engines.node >=24`). Run all commands under Node 24 (`nvm use`).
- **Package manager:** **pnpm 11** ONLY (pinned via `packageManager: pnpm@11.10.0`, `engines.pnpm >=11`). All plan text that says `npm install`/`npx` is SUPERSEDED — use `pnpm add`/`pnpm add -D`/`pnpm exec`. Never create a `package-lock.json`; the lockfile is `pnpm-lock.yaml` (commit it).
- **Supply-chain security:** lifecycle/build scripts are blocked by default — a package may run them only if added to `allowBuilds:` in `pnpm-workspace.yaml` (currently only `esbuild`), and only after a human deems it trustworthy. `.npmrc` enforces `node-linker=hoisted`, `minimum-release-age=10080` (7-day cooldown vs freshly-published malicious versions), `verify-store-integrity=true`. Keep dependencies minimal; justify every new one. Do not add a dependency to dodge a few lines of code. CI must use `pnpm install --frozen-lockfile`; run `pnpm audit` before releases.
- **GDPR / data protection (EU personal data):** treat all user data (email, display name, financial entries) as personal data. **Data minimization** — store only what a feature needs; request minimal Google OAuth scopes (profile/email only). Persist auth tokens only in secure storage (native: expo-secure-store; web: httpOnly where possible, else localStorage for non-secret prefs only). Every data-subject right must be technically supported: **export** (portability) and **full erasure** (delete account → cascade-delete the user's memberships, and household data they solely own) — see Tasks 32–33. Capture explicit **consent** to the privacy policy at sign-up (Task 34). No analytics/third-party trackers without a lawful basis. **Data residency + DPA are an open decision — see the Security & GDPR note below; do not assume US-hosting is acceptable without the DPA/DPF step.**

---

## Security & GDPR — decisions & process (not all code)

Engineering tasks are folded into the plan (Tasks 32–34 + the constraints above). These items are **process/legal**, tracked here so they aren't lost:
- **Data residency: DECIDED — US-hosted + EU-US Data Privacy Framework.** Keep Convex US-hosted; legal transfer basis = signed **DPA with Convex** + **EU-US DPF** (with SCCs as fallback). Before production: sign Convex's DPA, confirm Convex's DPF/SCC posture, and name Convex + Google as sub-processors in the privacy policy.
- **DPA:** sign Convex's Data Processing Addendum; record Convex (and Google, for auth) as sub-processors.
- **Privacy policy + lawful basis:** publish a privacy policy; lawful basis = consent (captured at sign-up, Task 34).
- **Breach process:** define a 72-hour breach-notification procedure before launch.
- **Secrets:** OAuth client secret and any keys live in Convex env vars / EAS secrets — never in the repo or client bundle. `.env.local` stays git-ignored.

---

## File Structure

```
mobile-budget/
├── app/                             # Expo Router routes
│   ├── _layout.tsx                  # Root: providers (Convex, Auth, Theme, Fonts), auth gate
│   ├── index.tsx                    # Redirect → onboarding or /(app)/home
│   ├── (onboarding)/
│   │   ├── welcome.tsx  fork.tsx  invite.tsx  join.tsx
│   └── (app)/
│       ├── _layout.tsx              # Tab shell (custom tab bar + FAB)
│       ├── home.tsx  reports.tsx  history.tsx  settings.tsx
├── src/
│   ├── theme/
│   │   ├── tokens.ts                # dark/light token objects + accent + currency glyphs
│   │   ├── ThemeProvider.tsx        # theme context, toggle, persisted pref
│   │   └── useTheme.ts
│   ├── budget/                      # PURE logic — no RN/Convex imports
│   │   ├── money.ts                 # fmt/fmtN/glyph/parse
│   │   ├── status.ts                # status(spent,limit,annual)
│   │   ├── periods.ts               # monthRange/yearRange/yearProgress
│   │   └── reports.ts               # category bars, trend, annual pace
│   ├── components/
│   │   ├── CategoryCard.tsx  ProgressRing.tsx  ProgressBar.tsx
│   │   ├── Sheet.tsx  Overlay.tsx  Toast.tsx  Numpad.tsx  Chip.tsx  Toggle.tsx
│   │   ├── TabBar.tsx  Fab.tsx
│   ├── features/
│   │   ├── AddExpenseSheet.tsx  CategoryDetail.tsx  ProfileOverlay.tsx
│   │   ├── NewCategorySheet.tsx  WeeklyCheckIn.tsx  MondayNotification.tsx
│   ├── hooks/                       # useHousehold, useCategories, useSummary, etc.
│   └── lib/toast.tsx                # toast context/provider
├── convex/
│   ├── schema.ts
│   ├── auth.ts  auth.config.ts      # @convex-dev/auth (Google)
│   ├── households.ts  categories.ts  transactions.ts  settings.ts
│   ├── seed.ts                      # seed Al-Marri sample household
│   └── _generated/
├── convex/tests/                    # convex-test specs
├── src/budget/*.test.ts             # vitest unit tests
├── app.json  eas.json               # Expo + PWA manifest, EAS build
├── vitest.config.ts  tsconfig.json  package.json
```

---

# Phase A — Foundation

### Task 1: Scaffold the Expo app and run it on web

**Files:** Create `package.json`, `app.json`, `tsconfig.json`, `app/_layout.tsx`, `app/index.tsx`, `.gitignore`.

**Interfaces:**
- Produces: a running Expo Router app served on web; `app/_layout.tsx` exports the root `Stack`.

- [ ] **Step 1: Create the Expo project (TypeScript, Expo Router tabs template) in-place**

```bash
cd /home/danielk/GIT/Noldor/mobile-budget
npx create-expo-app@latest . --template tabs --no-install
```
If it refuses because the dir is non-empty, scaffold in a temp dir and move files in, preserving `CLAUDE.md`, `docs/`, `.claude/`.

- [ ] **Step 2: Install deps**

```bash
npm install
npx expo install react-native-web react-dom @expo/metro-runtime react-native-svg
npx expo install @expo-google-fonts/dm-sans expo-font expo-secure-store expo-splash-screen
```

- [ ] **Step 3: Enforce code style** — add `.editorconfig` (`indent_style=tab`, `indent_size=4`; `[*.{yml,yaml,json}] indent_style=space indent_size=2`; `trim_trailing_whitespace=true`).

- [ ] **Step 4: Reduce the template to a single blank screen** — strip the demo tabs; `app/index.tsx` renders `<Text>Our Budget</Text>` centered.

- [ ] **Step 5: Run on web and verify it loads**

Run: `npx expo start --web` (or `npm run web`)
Expected: browser shows "Our Budget", no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Expo Router app (web + native)"
```

### Task 2: Add Convex and connect the provider

**Files:** Create `convex/schema.ts` (empty tables placeholder), `convex/README` via `npx convex dev`; Modify `app/_layout.tsx` (wrap in `ConvexProvider`). Create `.env.local` (gitignored) for `EXPO_PUBLIC_CONVEX_URL`.

**Interfaces:**
- Produces: `convex` client available app-wide via `ConvexProvider`.

- [ ] **Step 1: Install & init Convex**

```bash
npm install convex
npx convex dev --once --configure=new   # creates convex/ + EXPO_PUBLIC_CONVEX_URL in .env.local
```

- [ ] **Step 2: Minimal schema** — `convex/schema.ts` exports `defineSchema({})` (tables added in Phase B).

- [ ] **Step 3: Wrap the app** — in `app/_layout.tsx` create `const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!)` and wrap the `Stack` in `<ConvexProvider client={convex}>`. Throw at startup if the env var is missing (no silent fallback).

- [ ] **Step 4: Verify** — `npx convex dev` running in one terminal, `npx expo start --web` in another; app still renders, Convex dashboard reachable.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: wire Convex provider"` (do NOT commit `.env.local`).

### Task 3: Google auth via @convex-dev/auth

**Files:** Create `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`; Modify `convex/schema.ts` (spread `authTables`), `app/_layout.tsx` (ConvexAuthProvider). Create `src/hooks/useAuth.ts`.

**Interfaces:**
- Produces: `useAuthActions()` (`signIn`/`signOut`), `<Authenticated>/<Unauthenticated>/<AuthLoading>` gates, and `getAuthUserId(ctx)` in Convex functions.

- [ ] **Step 1: Install & init** — `npm install @convex-dev/auth @auth/core` then `npx @convex-dev/auth` (writes `auth.config.ts`, `http.ts`). Configure the **Google** OAuth provider per `@convex-dev/auth` docs; put client id/secret in Convex env (`npx convex env set AUTH_GOOGLE_ID …`). Document Apple as deferred (iOS phase).
- [ ] **Step 2: authTables** — spread `...authTables` into `defineSchema`.
- [ ] **Step 3: Provider** — wrap app in `<ConvexAuthProvider client={convex}>`.
- [ ] **Step 4: Gate** — `app/index.tsx` uses `<AuthLoading>` (splash), `<Unauthenticated>` (→ `/(onboarding)/welcome`), `<Authenticated>` (→ `/(app)/home`).
- [ ] **Step 5: Verify** — sign in with Google on web completes and lands on a placeholder home; `signOut` returns to welcome.
- [ ] **Step 6: Commit** — `git commit -m "feat: Google auth via convex-dev/auth"`.

### Task 4: DM Sans fonts + splash

**Files:** Modify `app/_layout.tsx`; Create `src/theme/fonts.ts`.

- [ ] **Step 1:** load `DMSans_400Regular…900Black` via `useFonts`; hold splash (`expo-splash-screen`) until loaded.
- [ ] **Step 2:** expose a `fontFamily` helper mapping weight→loaded family name.
- [ ] **Step 3: Verify** — text renders in DM Sans on web (inspect computed font).
- [ ] **Step 4: Commit** — `git commit -m "feat: load DM Sans"`.

### Task 5: Theme tokens + ThemeProvider

**Files:** Create `src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`.

**Interfaces:**
- Produces: `useTheme()` → `{ mode:'dark'|'light', t: Tokens, accent:string, toggle():void }`. `Tokens` = `{ bg, card, el, text, sub, line, track }`.

- [ ] **Step 1:** `tokens.ts`:
```ts
export const ACCENT = "#C96287";
export const dark  = { bg:"#17120E", card:"#221B16", el:"#2D251F", text:"#F6EDE3", sub:"#B5A493", line:"rgba(246,237,227,0.12)", track:"rgba(246,237,227,0.15)" };
export const light = { bg:"#F7F0E6", card:"#FFFDF9", el:"#F0E5D6", text:"#37291F", sub:"#8A7663", line:"rgba(55,41,31,0.08)", track:"rgba(55,41,31,0.10)" };
export const STATUS = { good:"#86B478", goodSub:"#8FBF7E", warn:"#E3A55C", warnSub:"#E3B063", overFrom:"#E3A55C", overTo:"#DD7A5E", overSub:"#E9967D" };
export const GLYPH = { AED:"Đ", USD:"$", GBP:"£", EUR:"€", ZAR:"R" } as const;
```
- [ ] **Step 2:** `ThemeProvider` holds mode (default `dark`), persists to `expo-secure-store`, exposes `toggle`.
- [ ] **Step 3:** wrap app; **Verify** a toggle button flips bg dark↔light.
- [ ] **Step 4: Commit** — `git commit -m "feat: theme tokens + provider"`.

---

# Phase B — Backend & budget logic

### Task 6: Convex schema (domain tables)

**Files:** Modify `convex/schema.ts`; Create `convex/tests/schema.test.ts`.

**Interfaces:**
- Produces tables (all ids `v.id`, timestamps `v.number`):
  - `households`: `name, inviteCode(string, unique-ish), currency(union of the 5), ownerId, createdAt` — index `by_invite` on `inviteCode`.
  - `memberships`: `householdId, userId, role('owner'|'member'), createdAt` — indexes `by_user`, `by_household`.
  - `categories`: `householdId, name, emoji, color, period('monthly'|'annual'), limit(number, minor units), sortOrder, archived(bool), createdBy, createdAt` — index `by_household`.
  - `transactions`: `householdId, categoryId, amount(number, minor units, >0), note, spentAt(number ms), payerName, createdBy, source('manual'|'sms'), raw(optional string), createdAt` — indexes `by_household`, `by_category`, `by_household_spentAt`.
  - `settings`: `userId, householdId, theme('dark'|'light'), layout('cozy-cards'|'grid'|'compact'), weeklyCheckin(bool), overNudges(bool), monthlyRecap(bool), profileColor(string), displayName(string)` — index `by_user_household`.

- [ ] **Step 1:** write the schema with the exact fields/indexes above.
- [ ] **Step 2:** `npx convex dev --once` — schema pushes with no validation error. **Verify** tables appear in dashboard.
- [ ] **Step 3: Commit** — `git commit -m "feat: Convex domain schema"`.

### Task 7: Budget math — `money.ts` (TDD)

**Files:** Create `src/budget/money.ts`, `src/budget/money.test.ts`, `vitest.config.ts`.

**Interfaces:**
- Produces: `glyph(cur)`, `fmt(minor, cur)` → `"Đ1,340"`, `fmtN(minor)` → `"1,340"`, `parseAmountToMinor(str)` → integer minor units.

- [ ] **Step 1: Failing tests**
```ts
import { fmt, fmtN, glyph, parseAmountToMinor } from "./money";
test("fmt rounds and groups with glyph", () => {
    expect(fmt(134000, "AED")).toBe("Đ1,340");
    expect(fmt(500, "USD")).toBe("$5");
});
test("fmtN has no glyph", () => expect(fmtN(1200000)).toBe("12,000"));
test("glyph maps currencies", () => expect(glyph("ZAR")).toBe("R"));
test("parseAmountToMinor handles decimals", () => {
    expect(parseAmountToMinor("12.5")).toBe(1250);
    expect(parseAmountToMinor("")).toBe(0);
});
```
- [ ] **Step 2:** `npx vitest run src/budget/money.test.ts` → FAIL.
- [ ] **Step 3: Implement** — minor units are integers; `fmt` = `glyph + Math.round(minor/100).toLocaleString('en-US')`. (Prototype shows whole units; rounding to whole display matches it.)
- [ ] **Step 4:** vitest → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: money formatting"`.

### Task 8: Budget math — `status.ts` (TDD)

**Files:** Create `src/budget/status.ts`, `src/budget/status.test.ts`.

**Interfaces:**
- Produces: `status(spentMinor, limitMinor, annual, cur)` → `{ level:'good'|'warn'|'over', barFrom, barTo|null, sub:string, subColor, pct:number }`. Thresholds & copy verbatim from prototype `status()`:
  - `pct>1` → over: gradient `#E3A55C→#DD7A5E`, sub `fmt(spent-limit)+' over — it happens 💛'`, subColor `#E9967D`.
  - `pct>=0.85` → warn: bar `#E3A55C`, sub `'Nearly there — '+fmt(left)+' left'+(annual?' this year':'')`, subColor `#E3B063`.
  - else good: bar `#86B478`, sub `fmt(left)+' left'+(annual?' this year':'')`, subColor `#8FBF7E`.

- [ ] **Step 1: Failing tests** covering all three bands + annual suffix (e.g. `status(134000,120000,false,'AED')` → level `over`, sub contains `Đ140 over — it happens 💛`).
- [ ] **Step 2:** vitest → FAIL.
- [ ] **Step 3: Implement** exactly per prototype.
- [ ] **Step 4:** vitest → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: budget status logic"`.

### Task 9: Budget math — `periods.ts` (TDD)

**Files:** Create `src/budget/periods.ts`, `src/budget/periods.test.ts`.

**Interfaces:**
- Produces: `monthRange(year,month)` → `{startMs,endMs}`; `yearRange(year)` → `{startMs,endMs}`; `yearProgressPct(nowMs)` → int 0..100 (day-of-year ÷ days-in-year × 100, replaces prototype's hardcoded `51`); `monthLabel(year,month)` → `"July 2026"`, `monthShort` → `"Jul"`.

- [ ] **Step 1: Failing tests** (e.g. `monthRange(2026,6)` covers Jul 1–31; `yearProgressPct(Date.UTC(2026,6,2))` ≈ 50).
- [ ] **Step 2:** FAIL. **Step 3:** implement with UTC math. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: period ranges"`.

### Task 10: Household mutations/queries (convex-test)

**Files:** Create `convex/households.ts`, `convex/tests/households.test.ts`.

**Interfaces:**
- Produces:
  - `createHousehold({name, currency})` → creates household + owner membership + default settings + seeds default categories (the 6 monthly + 3 annual from the spec); returns `householdId`. Generates a friendly `inviteCode` (e.g. `SUNNY-42` style: word + 2 digits).
  - `joinHousehold({code})` → validates via `by_invite`, adds membership (idempotent), returns `householdId`; throws "No household found for that code" if missing.
  - `myHouseholds()` → households for the signed-in user.
  - Helper `requireMembership(ctx, householdId)` — throws if caller not a member (used by all later functions).

- [ ] **Step 1: Failing tests** — with `convex-test`: creating a household makes the caller owner and seeds 9 categories; joining by a valid code adds membership; invalid code throws; non-member calling `requireMembership` throws.
- [ ] **Step 2:** `npx vitest run convex/tests/households.test.ts` → FAIL.
- [ ] **Step 3: Implement**; `createHousehold` must set `currency` default `AED` and write seed categories with the exact emojis/colors/limits (minor units) from the spec.
- [ ] **Step 4:** vitest → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: household create/join"`.

### Task 11: Category functions (convex-test)

**Files:** Create `convex/categories.ts`, `convex/tests/categories.test.ts`.

**Interfaces:**
- `listCategories({householdId})` → non-archived, ordered by `sortOrder`.
- `createCategory({householdId, name, emoji, period, limit})` → assigns a palette color (cycle `['#7FA86F','#E08B6F','#E3B063','#D492A6','#9C8FC7','#8FB5B0','#8AA3C4','#D97A8F']`) and next `sortOrder`; `annual` categories still store `period:'annual'`.
- `updateCategoryLimit({categoryId, limit})` → sets absolute limit (replaces prototype's bump-by-step; UI computes ±step).
- `archiveCategory({categoryId})`.
- All authorize via `requireMembership`.

- [ ] **Step 1: Failing tests** (create → appears in list with cycled color; limit update persists; archive hides it; non-member create throws).
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: category functions"`.

### Task 12: Transaction functions + spend aggregation (convex-test)

**Files:** Create `convex/transactions.ts`, `convex/tests/transactions.test.ts`.

**Interfaces:**
- `addTransaction({householdId, categoryId, amount, note, payerName, spentAt?})` — `amount>0`, `source:'manual'`, `spentAt` defaults now; authorizes membership + that the category belongs to the household.
- `listByCategory({categoryId, limit?})` — newest first.
- `summary({householdId, year, month})` → per-category `{categoryId, spent}` where monthly cats sum `monthRange`, annual cats sum `yearRange` (YTD); plus `totalSpent`, `totalLimit` over monthly cats (matches prototype's `totalSpent/totalLimit`).
- `monthTotals({householdId, months:n})` → array of `{label, short, total}` for the trend (monthly cats only per prototype).

- [ ] **Step 1: Failing tests** — add two txns in July to Groceries → `summary` reflects sum; an annual-cat txn from March still counts in the year's YTD; monthly-cat txn from March does NOT count in July's monthly spend; membership enforced.
- [ ] **Step 2:** FAIL → **Step 3:** implement using `by_household_spentAt` + `periods.ts` ranges → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: transactions + spend aggregation"`.

### Task 13: Reports aggregation + settings functions

**Files:** Create `convex/settings.ts`; Create `src/budget/reports.ts` + `src/budget/reports.test.ts`.

**Interfaces:**
- `reports.ts` (pure, fed by query data): `categoryBars(cats, spentByCat, cur)` (sorted desc, `w:'NN%'` of max), `trendCols(monthTotals)` (heights vs max, last col accented), `annualPace(annualCats, spentByCat, yearPct, cur)` → `{usedFmt, w, pace, paceColor}` using the prototype's ahead/on-pace copy (`'… a little ahead of the year 💛'` / `'… comfortably on pace 🌿'`).
- `settings.ts`: `getSettings({householdId})`, `updateSettings(partial)` (theme/layout/currency/notif prefs/profile), `setCurrency({householdId, currency})` (household-level).

- [ ] **Step 1: Failing tests** for `reports.ts` (bar widths, trend accent on last, pace bands). **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. (settings.ts verified via Task 20/21 UI.)
- [ ] **Step 5: Commit** — `git commit -m "feat: reports math + settings functions"`.

### Task 14: Seed script

**Files:** Create `convex/seed.ts` (internal mutation) that builds "The Al-Marri Home" with the spec categories + the prototype `TXNS` (converted to minor units, `spentAt` derived from the `when` labels relative to a fixed base date passed as an arg — no `Date.now()` inside).

- [ ] **Step 1:** implement; **Step 2: Verify** — run from dashboard/CLI, household + categories + transactions appear; `summary` for July matches prototype numbers (Groceries 1720, Dining 1340, …).
- [ ] **Step 3: Commit** — `git commit -m "feat: seed Al-Marri sample data"`.

---

# Phase C — App shell, hooks & onboarding

### Task 15: Data hooks

**Files:** Create `src/hooks/{useHousehold,useCategories,useSummary,useReports,useHistory,useSettings}.ts`.

**Interfaces:** thin wrappers over `useQuery`/`useMutation` returning typed, view-ready shapes (each card already run through `status()` + `money`), so screens stay declarative. `useHousehold()` resolves the caller's active household (first membership) and exposes `householdId`, `currency`.

- [ ] **Step 1:** implement hooks. **Step 2: Verify** a temporary debug screen logs live summary for the seeded household. **Step 3: Commit** — `git commit -m "feat: data hooks"`.

### Task 16: Reusable primitives

**Files:** Create `src/components/{ProgressBar,ProgressRing,Chip,Toggle,Sheet,Overlay}.tsx` and `src/lib/toast.tsx` + `src/components/Toast.tsx`.

**Interfaces:**
- `ProgressRing({pct, size, label})` — `react-native-svg` circle, accent stroke on `track`, animates 0→pct on mount (match prototype ring).
- `ProgressBar({pct, from, to?})` — rounded track + fill (gradient when `to` given via `expo-linear-gradient` or an SVG rect).
- `Sheet` — bottom sheet with `sheetUp` slide+fade animation, scrim, drag-to-dismiss optional.
- `Overlay` — full-screen slide-in (category detail / profile).
- `Toast` — `toastPop` animation, auto-dismiss 2400ms, driven by `useToast()`.
- `Toggle` — pill switch (accent when on), `Chip` — selectable pill.

- [ ] **Step 1:** build each to match prototype styling/animation. **Step 2: Verify** on a scratch screen. **Step 3: Commit** — `git commit -m "feat: UI primitives"`.

### Task 17: Onboarding screens

**Files:** Create `app/(onboarding)/{welcome,fork,invite,join}.tsx`.

**Behavior (match prototype ONBOARDING sections):**
- **welcome:** brand lockup + value line + "Continue with Google" (calls `signIn('google')`) + "Continue with Apple" (disabled/"coming soon" on web). After auth, if the user has no household → `fork`, else → home.
- **fork:** "Create a household" → `invite`; "Join with a code" → `join`.
- **invite:** calls `createHousehold`, shows the generated code with a Share button (`shareInvite` → toast "Invite link copied 📋"); "Enter our budget" → home.
- **join:** uppercase code input → `joinHousehold`; on success → home; on failure → inline error.

- [ ] **Step 1:** implement all four, wired to Task 10 mutations. **Step 2: Verify** end-to-end on web: new Google user → create household → lands on seeded-empty home; second user joins by code and sees the same household. **Step 3: Commit** — `git commit -m "feat: onboarding flow"`.

### Task 18: Tab shell (tab bar + FAB)

**Files:** Create `app/(app)/_layout.tsx`, `src/components/TabBar.tsx`, `src/components/Fab.tsx`.

**Behavior:** custom bottom tab bar (Home/Reports/History/Settings, accent on active per `tabColor`), center-ish FAB "+" opening the Add-Expense sheet, honoring the system nav-bar inset (match prototype TAB BAR + FAB sections). Sheets/overlays render above the shell.

- [ ] **Step 1:** implement. **Step 2: Verify** tab switching + FAB opens a placeholder sheet. **Step 3: Commit** — `git commit -m "feat: tab shell + FAB"`.

---

# Phase D — Screens & features

> Each task below: build the screen to **exactly match** the referenced prototype section (layout, spacing, radii, colors from theme tokens, copy), wired to the Phase B hooks. Each ends with a manual verification against the prototype and a commit. Where a screen has meaningful derived logic already covered by unit tests (status, reports), reuse those modules — do not re-derive.

### Task 19: Home dashboard — summary + three layouts

**Files:** Create `app/(app)/home.tsx`, `src/components/CategoryCard.tsx`.
**Reference:** HOME TAB → COZY CARDS / GRID / COMPACT; summary ring; sections "This month" (hint "resets on the 1st") and "Annual budgets" (hint "build up all year").
- Summary: `ProgressRing` with `ringPct`/`ringLabel`, `totalSpentFmt` / `totalLimitFmt`, `summarySub` ("… you've got this 🌿" / "… deep breath 💛").
- `CategoryCard` variants driven by `layout` from settings; each card shows emoji tile (`color+'30'` bg), name, `amtFmt`, `ofFmt`, `ProgressBar`, `sub`. Tap → category detail.
- [ ] Build cozy-cards first, then grid + compact; layout comes from `useSettings().layout`. Verify all three against prototype. Commit `feat: home dashboard`.

### Task 20: Category detail overlay

**Files:** Create `src/features/CategoryDetail.tsx`. **Reference:** CATEGORY DETAIL OVERLAY.
- Header (emoji, name, `periodLabel`, big `amtFmt` / `ofFmt`), progress bar, limit editor (± calls `updateCategoryLimit` with ±100 monthly / ±500 annual), "+ Add to <name>" opens the sheet pre-selected, and the transaction list (`txns` with payer initial avatar in `whoBg`/`whoColor`, `meta`).
- [ ] Build + wire; verify limit edit persists and reflects live; commit `feat: category detail`.

### Task 21: Add-expense sheet

**Files:** Create `src/features/AddExpenseSheet.tsx`, `src/components/Numpad.tsx`. **Reference:** ADD EXPENSE SHEET.
- Big amount display (`amountFmt`, glyph + grouping, `amountColor`), custom `Numpad` (`1..9 . 0 ⌫`, max 6 digits, single decimal), category chips (all monthly+annual, selected → accent), note input, payer toggle (Sara/Omar using profile color / `#7FA8A0`), confirm button (`confirmLabel` "Add ĐN to <cat>" / disabled state), `addTransaction` on confirm → toast "Added ĐN to <cat> 🎉" and optimistic close.
- [ ] Build + wire; verify a new expense appears live on Home and in category detail; commit `feat: add-expense sheet`.

### Task 22: Reports tab

**Files:** Create `app/(app)/reports.tsx`. **Reference:** REPORTS TAB.
- Category bars (`reports.categoryBars`), month-over-month trend columns (`trendCols`, last accented), annual pace list (`annualPace` with per-category pace copy + `paceColor`). Uses live query data through `src/budget/reports.ts`.
- [ ] Build + wire; verify numbers match seeded data; commit `feat: reports tab`.

### Task 23: History tab

**Files:** Create `app/(app)/history.tsx`. **Reference:** HISTORY TAB.
- Month switcher (`‹ July 2026 ›`), `histTotal` / `histLimit`, category cards for the selected month (monthly cats for past months; current month includes custom cats). Prev/next bounded (can't go past current month). Uses `useHistory(monthIdx)` → `summary` for that month.
- [ ] Build + wire; verify switching months reloads correct spend; commit `feat: history tab`.

### Task 24: Settings tab

**Files:** Create `app/(app)/settings.tsx`. **Reference:** SETTINGS TAB.
- Theme toggle (`themeLabel` "Cozy dark mode 🌙"/"Warm light mode ☀️"), currency picker (5 options, persists via `setCurrency`), dashboard layout picker (cozy/grid/compact), notification preference toggles (weekly/over/monthly → `updateSettings`), profile row → opens Profile overlay, sign-out. Light mode must fully re-token the app.
- [ ] Build + wire; verify theme + currency + layout changes reflect app-wide and persist; commit `feat: settings tab`.

### Task 25: Profile overlay

**Files:** Create `src/features/ProfileOverlay.tsx`. **Reference:** PROFILE OVERLAY.
- Editable display name + email, avatar initial in `profileColor`, 6 color swatches (`['#D98BA4','#7FA8A0','#E3B063','#9C8FC7','#86B478','#C96287']`) → `updateSettings`. Name/color flow through to payer chip + txn avatars.
- [ ] Build + wire; verify color change updates avatars live; commit `feat: profile overlay`.

### Task 26: New-category sheet

**Files:** Create `src/features/NewCategorySheet.tsx`. **Reference:** NEW CATEGORY SHEET.
- Emoji/name presets grid (the 12 in the prototype `ncEmojis`, auto-fills name until user types), monthly/annual toggle (default limits 1000 / 5000), limit stepper (±100 monthly / ±500 annual), create button → `createCategory` → toast "<emoji> <name> added 🎉". Reachable from Home ("+ New category") and Settings.
- [ ] Build + wire; verify a created category appears in Home + chips; commit `feat: new-category sheet`.

### Task 27: Weekly check-in + Monday notification

**Files:** Create `src/features/WeeklyCheckIn.tsx`, `src/features/MondayNotification.tsx`. **Reference:** MONDAY NOTIFICATION + WEEKLY CHECK-IN SHEET.
- **MondayNotification:** in-app banner (`notifDown` animation) shown when `settings.weeklyCheckin` and on Home; body from live data ("<left> left overall. <cat> is <over> over — tap for your week."). Tap → weekly sheet; dismissable.
- **WeeklyCheckIn:** sheet with the 4 summary rows computed from the last 7 days of transactions (spent last week, biggest category, watch/over category, on-track list) — real aggregation, warm copy. "Have a lovely week 🌿" close → toast.
- Document clearly (code comment + NOTES) that these are **in-app only**; real scheduled push/email is a later phase.
- [ ] Build + wire to a `weeklySummary` query (add to `convex/transactions.ts`, last-7-days aggregation, with a test). Verify banner appears on Home and sheet shows real numbers. Commit `feat: weekly check-in + notification`.

---

# Phase E — Cross-cutting polish & ship

### Task 28: PWA manifest + installability

**Files:** Modify `app.json` (web: name "Our Budget", theme/background `#17120E`, icons, `display:standalone`); ensure service worker / offline shell via Expo web export.
- [ ] Configure; **Verify** `npx expo export -p web` produces an installable PWA (Lighthouse PWA checks pass: manifest, installable, themed). Commit `feat: PWA manifest`.

### Task 29: Animations & empty/loading/error states

- [ ] Add the prototype's mount animations (cards/ring fill on mount, `slideIn`, `fadeIn`), skeleton/loading for queries, and honest error surfaces (no silent fallback) for failed mutations (toast the error). Verify. Commit `feat: motion + loading/error states`.

### Task 30: Android build sanity (EAS)

**Files:** Create `eas.json`.
- [ ] Configure an EAS **development/preview** profile; run `eas build -p android --profile preview` (or local `expo run:android`) far enough to confirm the app boots on Android and auth + a live query work. (Store submission is a separate later effort.) Document Apple Sign-In as the remaining task before an iOS build. Commit `chore: EAS Android profile`.

### Task 31: Final verification pass

- [ ] Run the full suite: `pnpm exec vitest run` (all budget + convex tests green), `pnpm exec tsc --noEmit` (strict, clean), `pnpm exec expo start --web` smoke of every screen against the prototype. Fix gaps. Use `superpowers:verification-before-completion` before declaring done. Commit any fixes.

---

# Phase F — Security & GDPR (data-subject rights)

> Personal financial data of potential EU users → GDPR applies. These are the engineering pieces; the process/legal pieces (DPA, privacy policy, residency, breach process) live in the "Security & GDPR" note near the top.

### Task 32: Account & data export (portability)

**Files:** Create `convex/account.ts` (`exportMyData` query) + `convex/tests/account.test.ts`; wire a "Download my data" action in Settings.
- `exportMyData()` — authorizes the caller, returns a JSON bundle of ALL their personal data: their user record, memberships, and for households they belong to, the categories + transactions they created (and, for households they solely own, the full household). No other member's PII beyond what's inherent to shared transactions (payer display names already visible in-app).
- [ ] **TDD:** seed a user with data → `exportMyData` returns their records and NOT an unrelated user's. Wire Settings button to fetch + save/share the JSON. Verify. Commit `feat: GDPR data export`.

### Task 33: Account deletion & erasure (right to be forgotten)

**Files:** Create `convex/account.ts` (`deleteMyAccount` mutation) + tests; Settings "Delete account" flow with confirmation.
- `deleteMyAccount()` — authorizes; deletes the user's memberships; for households where they are the SOLE owner/member, cascade-delete the household + its categories + transactions; for shared households, remove membership and reassign/retain shared records per a documented rule (transactions keep a tombstoned payer label, not the deleted user's account link). Finally delete the auth user record. Must be idempotent and leave no orphaned personal data.
- [ ] **TDD:** create user+data → `deleteMyAccount` → assert user record, memberships, and solely-owned household data are gone; shared-household records handled per rule; second call is a no-op. Confirmation UI (type-to-confirm). Verify. Commit `feat: GDPR account erasure`.

### Task 34: Consent capture at sign-up

**Files:** Modify `app/(onboarding)/welcome.tsx`; add `consentAt`/`policyVersion` to the user's `settings`/user record (schema note in Task 6).
- On first sign-in, require an explicit checkbox consent to the Privacy Policy + Terms (link out), recording `policyVersion` + timestamp before creating/joining a household. Minimal Google OAuth scopes (profile, email).
- [ ] Implement + verify the gate blocks progress until consented and records it. Commit `feat: sign-up consent capture`.

---

## Self-Review notes
- **Spec coverage:** onboarding ✓(17) · pooled household/auth ✓(3,10) · monthly+annual categories ✓(6,11,12) · limits/progress ✓(8,19) · add-expense/SMS-ready model ✓(6,21) · reports ✓(13,22) · history ✓(23) · settings/theme/currency/layout ✓(24) · profile ✓(25) · custom categories ✓(26) · notification+weekly ✓(27, in-app) · PWA ✓(28) · Android ✓(30).
- **Security/GDPR coverage:** pnpm supply-chain guards + Node 24 (Global Constraints) · data export ✓(32) · erasure ✓(33) · consent ✓(34) · residency/DPA/policy = process note (top).
- **Deferred (documented):** real push/email, SMS parsing, Apple Sign-In/iOS build, wallets, income.
- **Type consistency:** `summary()` shape consumed identically by hooks (15) and screens (19–23); `status()` output shape fixed in Task 8 and reused; `createCategory` palette matches `ncCreate` palette in the prototype.
```
