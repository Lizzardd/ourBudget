# TODO

Known gaps and follow-ups. Ordered by how much they hurt.

Legend: **P0** blocks the app working · **P1** ships a lie to the user ·
**P2** correctness / hygiene · **P3** nice to have

---

## Where things are deployed

| | State |
|---|---|
| **Convex prod** (`shiny-scorpion-150`) | Current — `paidBy`, edit/delete transaction, the household-delete cascade, and both migrations are live. |
| **Phone (APK)** | v0.1.10 build, running OTA bundles. **OTA works** — JS changes land via `pnpm update:android` in seconds, no rebuild. |
| **Migrations** | `normalizeExistingInviteCodes` ✅ · `backfillPaidBy` ✅ (0 rows — table was empty). |

**Rules that must hold:** build first, then publish updates (an update older than
the embedded bundle can never launch). Only bump `runtimeVersion` (`"1"` → `"2"`)
when the native layer changes — which is exactly when a rebuild is needed anyway.

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

### `updateTransaction` patches `memo` unconditionally
Passing `memo: undefined` **clears** an existing memo. Right for a form that
always submits its current field values, a trap for any future partial-update
caller. (`paidBy` had the same shape and it was a real bug — an edit erased the
payer of anyone who had left the household. Fixed by only re-validating
membership when the payer actually changes.)

### `settings` has no `by_household` index
The household-delete cascade has to `.filter()`-scan `settings`, which is only
indexed `by_user_household`. Fine on a cold delete path; add the index if that
table ever grows.

### Push the tags
`main` is pushed; tags `v0.1.0`–`v0.1.11` are local only:

```
git push origin main --tags
```

### Shell keeps reverting to Node 22
`.nvmrc` pins 24 but `pnpm` still prints the engine warning in fresh shells.
Worth a shell hook — the machine that bundles an OTA update should be on the
version the project declares.

---

## P3 — Untested surfaces

- **iOS has never been built or run.** The keyboard fix's `keyboardWillShow`
  path, Apple auth and safe areas are all unexercised.
- **Web/PWA** exports cleanly (`pnpm web:build`) but is not deployed anywhere.

---

## Deliberate deviations from the prototype

- The version string sits on its own line under `ourbudget.`; the prototype
  still has it inline. This was an explicit user request — recorded so it is not
  "fixed" back by mistake.

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
