# TODO

Known gaps and follow-ups. Ordered by how much they hurt.

Legend: **P0** blocks the app working · **P1** ships a lie to the user ·
**P2** correctness / hygiene · **P3** nice to have

---

## Where things are deployed

| | State |
|---|---|
| **Convex prod** (`shiny-scorpion-150`) | Current as of v0.2.3 — `paidBy`, edit/delete transaction, the household-delete cascade, `payeeHistory`, the `settings.by_household` index, and both migrations are live. |
| **Phone (APK)** | v0.1.10 build, running OTA bundles. **OTA works** — JS changes land via `pnpm update:android` in seconds, no rebuild. |
| **Migrations** | `normalizeExistingInviteCodes` ✅ · `backfillPaidBy` ✅ (0 rows — table was empty). |

**Rules that must hold:**

1. **Build first, then publish updates.** An update older than the embedded
   bundle can never launch.
2. **Deploy Convex BEFORE publishing an OTA that calls a new function.** This is
   not housekeeping — it is a hard dependency, and getting it backwards bricks
   the app in a silent rollback loop. v0.2.2 added the `payeeHistory` query and
   shipped the OTA without `pnpm convex:deploy`; the bundle downloaded, booted,
   called a function that did not exist on the deployment, threw, and
   expo-updates marked it failed (`failureCount = 1`) and rolled back to the
   embedded bundle — on every launch, forever. Nothing in the update log says
   "missing function": it just looks like the update refuses to apply. The tell
   is `embedded=true` alongside a `failureCount` above zero. Verify with
   `npx convex function-spec --prod` before publishing.
3. **Only bump `runtimeVersion`** (`"1"` → `"2"`) when the native layer changes —
   which is exactly when a rebuild is needed anyway.

---

## P0 — none

OTA was the last P0 and is **confirmed working on device** (v0.1.10:
`embedded=false`, `failureCount=0`, 35/35 assets, no ErrorRecovery lines).

### What it actually was, so it is never re-litigated

`getModulesRunBeforeMainModule` lists the modules Metro runs BEFORE the entry
file. `InitializeCore` — which installs RN's fetch polyfill and with it
`globalThis.Headers` — was not guaranteed to be first in an *export* bundle
(`expo export`, which is what `eas update` publishes; EAS Build uses
`expo export:embed` and was always fine). Expo's winter runtime ran ahead of it,
found no `Headers`, and threw before React rendered. expo-updates rolled back to
the embedded bundle and blacklisted the update — silently, invisible from JS.
See expo#36099.

Fixed by pinning `InitializeCore` first in `metro.config.js`. It **cannot** be
fixed from the entry file: those modules run *before* the entry, so an import at
the top of `index.native.js` is already too late.

**Four earlier "fixes" were all real bugs, and none was the blocker** — the
`appVersion` and `fingerprint` runtime policies (both churned the runtime and
orphaned installs), the dev-vs-prod Convex URL in locally-bundled updates, the
~10MB font payload that blocked first render, and the `EXPO_PUBLIC_USE_RN_FETCH`
flag. All are fixed and all are worth keeping.

**The lesson:** read the native update log first (`Updates.readLogEntriesAsync`),
search the error string second, theorise last. Hours went into inferring causes
from symptoms while the exception sat in the log the whole time.

---

## P1 — UI that promises something it does not do

### Notification toggles are inert
Settings offers **Weekly check-in**, **Over-budget nudges** and **Monthly recap
email**. There is no `expo-notifications`, no scheduling and no push anywhere in
the codebase — the toggles write a flag to Convex that nothing reads. The Monday
banner is in-app only. Either implement them or stop showing them. **This is the
biggest remaining lie in the UI.**

### Monthly recap email
No email sending exists at all. Same call: build it or remove the row.

### Apple sign-in
Still a disabled "coming soon" button on the welcome screen.

### SMS ingestion
`transactions.source` allows `"sms"` and there is a `raw` field, but nothing
ingests SMS. Dead schema surface — implement or drop the union member.

---

## P2 — Correctness and hygiene

### The OTA diagnostics panel still ships
`OtaDiagnostics` is debug UI at the bottom of Settings (Show/Share update logs).
It did its job and found the bug; it should come out now. Removing it is also a
good low-risk test of the OTA flow.

---

## P3 — Untested surfaces

- **iOS has never been built or run.** The keyboard fix's `keyboardWillShow`
  path, Apple auth and safe areas are all unexercised.
- **Web/PWA** exports cleanly (`pnpm web:build`) but is not deployed anywhere.

---

## Deliberate deviations from the prototype

### The amount uses the OS keypad, not the prototype's custom numpad
The prototype specifies a custom numpad grid for the amount, and the designer
recently *compacted* it rather than removing it — so it is a live choice, not an
oversight. We removed it anyway, on the user's explicit instruction. Recorded so
it is not "restored" by a future sync.

**Why:** the sheet had two competing input mechanisms. The amount used an
always-visible custom numpad, while "Where?" and "Add a note" are real text
fields that summon the OS keyboard — so on a phone both fought for the same
vertical space, which is what forced the keyboard-avoidance work in the first
place. The prototype never feels this, because in a browser the text fields and
`<input type="date">` all use the same native chrome. One keyboard per sheet.

Worth raising with the designer rather than leaving the app and the design
permanently disagreeing.

---

## Notes

- **The month is 0-based.** `monthRange` uses `Date.UTC(year, month, 1)`, so July
  is `6`. Home passed `getMonth() + 1` and so read August — a valid, *empty*
  month — and reported Đ0 spent while the category screens showed the real
  figures (v0.1.11). Silent off-by-ones that return an empty result rather than
  failing are exactly the kind that reach production; there is now a regression
  test that demonstrates the trap.
- The `app/preview/*` screenshot harness and `scripts/shoot.mjs` were **deleted**
  (v0.1.6). They duplicated the real UI with mock data and drifted on every
  design change — that duplication is how the prototype's demo-data payers
  (`Sara` / `Omar`) survived in the codebase, right down to `payerAvatar()`
  hardcoding `payerName === 'Sara'` to pick an avatar colour. Verification
  happens on-device now. `playwright` stays: `scripts/gen-icons.mjs` uses it.
- `.claude/skills/prototype-sync/` encodes the design-sync workflow and the
  failure modes that produced several of the bugs above. Use `/prototype-sync`
  whenever the prototype changes.
