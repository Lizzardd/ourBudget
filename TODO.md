# TODO

Known gaps and follow-ups. Ordered by how much they hurt.

Legend: **P0** blocks the app working · **P1** ships a lie to the user ·
**P2** correctness / hygiene · **P3** nice to have

---

## P0 — Blocking

### Font payload blocks the app from rendering (this was the OTA "crash")
An OTA update ships **~10MB of fonts** and `app/_layout.tsx` refuses to render
anything until every one of them resolves. In a real build the fonts are baked
into `android_res/raw`, so this is instant. Over the air they must be fetched —
and until they are, `useFonts` never settles, `RootLayout` returns `null`, the
splash is never hidden, and the app looks bricked. Force-closing restarts the
download, so it can never finish. That is the whole "OTA is broken" saga: not a
crash, not a rollback — a **hang**, with no error anywhere.

**Fixed, both halves:**

1. `RootLayout` now renders after a 5s font timeout. Degraded typography beats a
   dead app, and it turns a silent hang into something visible.
2. The bloat itself. `src/theme/fonts.ts` imported from the **package root** —
   whose index re-exports every weight in the family, each `require()`ing its
   .ttf. One root import therefore dragged in the whole family. Importing each
   weight from its own subpath (`@expo-google-fonts/dm-sans/400Regular`) bundles
   only the file named:

   | | before | after |
   |---|---|---|
   | font files | 26 | **8** |
   | font bytes | ~10 MB | **2.41 MB** |

**Remaining 2.41MB, and why:**
- `MaterialSymbolsRounded_300Light` — 1.2MB. This is our icon font; we need it.
  Could be subsetted to the ~30 ligatures we actually use, which would cut most
  of it, but that needs a build step.
- `MaterialSymbols_400Regular` — 934KB, pulled in by `expo-symbols`, a
  transitive dependency of `expo-router`. Not ours and not importable away;
  blocking it in the Metro resolver risks breaking the router. Left alone.
- 6 × DM Sans @ 55KB — needed.

Worth considering later: embed the fonts natively via the `expo-font` config
plugin, so OTA updates carry **no** font payload at all. That is a native change
(→ `runtimeVersion` `"2"` + rebuild).

**Rules that must hold:** always build *first*, then publish updates (an update
older than the embedded bundle can never launch). Only bump `runtimeVersion`
(`"1"` → `"2"`) when the native layer changes, which is exactly when a rebuild
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
banner is in-app only. Either implement them or stop showing them.

### Monthly recap email
No email sending exists at all. Same call as above: build it or remove the row.

### Apple sign-in
Still a disabled "coming soon" button on the welcome screen.

### SMS ingestion
`transactions.source` allows `"sms"` and there is a `raw` field, but nothing
ingests SMS. Dead schema surface — implement or drop the union member.

---

## P2 — Correctness and hygiene

### `payerName` is a free string, not a user reference
If a member renames themselves, their existing expenses keep the stale name:
`payerAvatar` no longer matches them (falls back to neutral grey) and the payer
chip will not preselect. Storing `userId` and resolving the name at read time is
the correct model.

### Household delete orphans `settings` and `consents`
`leaveHousehold`'s cascade removes categories, transactions and the household
row, but not the per-user `settings` / `consents` rows tied to it. Untidy, and
GDPR-adjacent given the data-deletion promise in Settings.

### `updateTransaction` patches `memo` unconditionally
Passing `memo: undefined` **clears** an existing memo. That is right for a form
that always submits its current field values, but it is a trap for any future
partial-update caller.

### The OTA diagnostics panel still ships
`OtaDiagnostics` is temporary debug UI sitting at the bottom of Settings. Strip
it once OTA is confirmed working.

### Push the tags
`main` is pushed and matches `v0.1.5`, but the tags may not be:

```
git push origin main --tags
```

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
  (`Sara` / `Omar`) survived in the codebase for so long. Verification happens
  on-device now. `playwright` stays as a dependency: `scripts/gen-icons.mjs`
  still uses it.
- `.claude/skills/prototype-sync/` encodes the design-sync workflow and the
  failure modes that produced several of the bugs above. Use it (`/prototype-sync`)
  whenever the prototype changes.
