# TODO

Known gaps and follow-ups. Ordered by how much they hurt.

Legend: **P0** blocks the app working · **P1** ships a lie to the user ·
**P2** correctness / hygiene · **P3** nice to have

---

## Where things are deployed

| | State |
|---|---|
| **Convex prod** (`shiny-scorpion-150`) | Current as of v0.1.6 — `paidBy`, `updateTransaction` / `deleteTransaction`, the household-delete cascade, and both migrations are all live. |
| **Phone (APK)** | **Behind.** The installed build predates the font fix, `paidBy`, and edit/delete expense. A rebuild is needed before any of it is usable. |
| **Migrations** | `normalizeExistingInviteCodes` ✅ run · `backfillPaidBy` ✅ run (0 rows — the transactions table was empty, so there was nothing to migrate). |

---

## P0 — Blocking

### OTA: the font hang is fixed in code, but NOT verified on a device

The cause is finally understood. It was never a crash or a rollback — it was a
**hang**. `app/_layout.tsx` refused to render until every font resolved, and an
update shipped **~10MB of them**. A real build bakes fonts into
`android_res/raw` (instant); an OTA must download them first, so `useFonts`
never settled, `RootLayout` returned `null` forever, the splash was never
hidden, and the app looked bricked. Force-closing restarted the download, so it
could never finish.

Both halves are fixed in v0.1.6:

1. `RootLayout` renders after a **5s font timeout**. Degraded typography beats a
   dead app, and it turns a silent hang into something visible.
2. `src/theme/fonts.ts` imported from the **package root**, whose index
   re-exports every weight and `require()`s each .ttf — so one import dragged in
   the whole family. Subpath imports (`@expo-google-fonts/dm-sans/400Regular`)
   bundle only the file named:

   | | before | after |
   |---|---|---|
   | font files | 26 | **8** |
   | font bytes | ~10 MB | **2.41 MB** |

**This is still P0 because nothing has confirmed it.** No OTA update has yet
landed cleanly on a build that contains these fixes. To close it: build v0.1.6+,
install, `pnpm update:android`, then **Settings → Check for updates → Restart**.
Done = `embedded: false` and no splash hang. Anything else → **Share logs ↗**.

**Remaining 2.41MB, and why:**
- `MaterialSymbolsRounded_300Light` (1.2MB) — our icon font. Could be subsetted
  to the ~30 ligatures we actually use, but that needs a build step.
- `MaterialSymbols_400Regular` (934KB) — pulled in by `expo-symbols`, a
  transitive dep of `expo-router`. Not ours; blocking it in the Metro resolver
  risks breaking the router. Left alone.
- 6 × DM Sans @ 55KB — needed.

Better still, later: embed the fonts natively via the `expo-font` config plugin
so OTA updates carry **no** font payload at all. Native change → `runtimeVersion`
`"2"` + rebuild.

**Rules that must hold:** always build *first*, then publish updates (an update
older than the embedded bundle can never launch). Only bump `runtimeVersion`
(`"1"` → `"2"`) when the native layer changes — which is exactly when a rebuild
is required anyway.

**Theories that turned out to be wrong** (recorded so they are not re-litigated):
the `appVersion` and `fingerprint` runtime policies, and the missing
`EXPO_PUBLIC_CONVEX_URL` in locally-bundled updates. All three were real bugs and
are fixed — none of them was the hang.

---

## P1 — UI that promises something it does not do

### Notification toggles are inert
Settings offers **Weekly check-in**, **Over-budget nudges** and **Monthly recap
email**. There is no `expo-notifications`, no scheduling and no push anywhere in
the codebase — the toggles write a flag to Convex that nothing reads. The Monday
banner is in-app only. Either implement them or stop showing them. This is the
biggest remaining lie in the UI.

### Monthly recap email
No email sending exists at all. Same call as above: build it or remove the row.

### Apple sign-in
Still a disabled "coming soon" button on the welcome screen.

### SMS ingestion
`transactions.source` allows `"sms"` and there is a `raw` field, but nothing
ingests SMS. Dead schema surface — implement or drop the union member.

---

## P2 — Correctness and hygiene

### `updateTransaction` patches `memo` unconditionally
Passing `memo: undefined` **clears** an existing memo. That is right for a form
that always submits its current field values, but it is a trap for any future
partial-update caller. (`paidBy` had the same shape and was a real bug — an edit
would erase the payer of anyone who had left the household. Fixed by only
re-validating membership when the payer actually changes. `memo` has no such
guard because nothing depends on it yet.)

### The OTA diagnostics panel still ships
`OtaDiagnostics` is temporary debug UI at the bottom of Settings, along with its
**Show update logs** / **Share logs** buttons. Strip it once OTA is confirmed
working — it is the last thing keeping P0 debuggable, so it stays until then.

### `settings` has no `by_household` index
The household-delete cascade has to `.filter()`-scan `settings` because it is
only indexed `by_user_household` (`["userId","householdId"]`), which cannot be
range-scanned by household alone. Acceptable on a cold delete path; add a
`by_household` index if that table ever grows.

### Push the tags
`main` is pushed, but the tags are local-only:

```
git push origin main --tags
```

### Shell keeps reverting to Node 22
`.nvmrc` pins 24, but `pnpm` still prints the engine warning in fresh shells, so
`nvm use` is not sticking. Worth a shell hook — the machine that bundles an OTA
update should be on the version the project declares.

---

## P3 — Untested surfaces

- **iOS has never been built or run.** The keyboard fix's `keyboardWillShow`
  path, Apple auth and safe areas are all unexercised.
- **Web/PWA** exports cleanly (`pnpm web:build`) but is not deployed anywhere.

---

## Deliberate deviations from the prototype

- The version string sits on its own line under `ourbudget.`; the prototype
  still has it inline. This was an explicit user request — recorded here so it
  is not "fixed" back by mistake.

---

## Notes

- The `app/preview/*` screenshot harness and `scripts/shoot.mjs` were **deleted**
  (v0.1.6). They duplicated the real UI with mock data and drifted on every
  design change — that duplication is how the prototype's demo-data payers
  (`Sara` / `Omar`) survived in the codebase for so long, right down to
  `payerAvatar()` hardcoding `payerName === 'Sara'` to pick an avatar colour.
  Verification happens on-device now. `playwright` stays as a dependency:
  `scripts/gen-icons.mjs` still uses it.
- `.claude/skills/prototype-sync/` encodes the design-sync workflow and the
  failure modes that produced several of the bugs above. Use it
  (`/prototype-sync`) whenever the prototype changes.
