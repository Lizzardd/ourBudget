# OTA post-mortem

Over-the-air updates (`expo-updates` / `eas update`) are **not currently the
delivery mechanism** — the Android app is sideloaded. This document exists so the
hard-won knowledge isn't lost, and so OTA can be revived safely if wanted.

## The one lesson

**Read the native update log first (`Updates.readLogEntriesAsync`), search the
error string second, theorise last.** Hours went into inferring causes from
symptoms while the actual exception sat in the log the whole time. Everything
below is downstream of not doing this soon enough.

## Status

- **Confirmed working on the runtime-`"1"` build** (v0.1.10): `embedded=false`,
  `failureCount=0`, 35/35 assets, no ErrorRecovery lines.
- **Never re-proven on runtime `"2"` or `"3"`.** v0.2.0 bumped the runtime for the
  date picker; every OTA published against the runtime-2 build downloaded,
  launched, and was rolled back. The runtime-3 build that carries the crash
  recorder (below) was blocked by the EAS free-plan quota and never installed.

So: OTA is proven on a build no longer in use, and unproven on the current one.
That's *why* the app is sideloaded for now.

## Root cause of the runtime-1 saga (fixed)

`getModulesRunBeforeMainModule` lists the modules Metro runs **before** the entry
file. `InitializeCore` — which installs RN's fetch polyfill and with it
`globalThis.Headers` — was not guaranteed to be first in an *export* bundle
(`expo export`, what `eas update` publishes; EAS Build uses `expo export:embed`
and was always fine). Expo's winter runtime ran ahead of it, found no `Headers`,
and threw before React rendered. expo-updates rolled back and blacklisted the
update — silently, invisible from JS. (See expo#36099.)

**Fixed by pinning `InitializeCore` first in `metro.config.js`.** It *cannot* be
fixed from the entry file — those modules run before the entry, so an import at
the top of `index.native.js` is already too late.

## Four earlier "fixes" — all real bugs, none the blocker

Kept because each was genuinely wrong, but none was the cause:

1. `appVersion` and `fingerprint` runtime policies — both churned the runtime and
   orphaned installs. Pinned to a fixed string.
2. Dev-vs-prod Convex URL baked into locally-bundled updates. Pinned prod inline
   in the update scripts.
3. A ~10MB font payload blocked first render. Cut to subpath imports + a font
   timeout.
4. `EXPO_PUBLIC_USE_RN_FETCH` — RN's fetch instead of `expo/fetch`.

## The runtime-2 investigation (unresolved on-device)

Every runtime-2 OTA rolled back with `failureCount = 1`. Ruled out with evidence:
delivery was fine (`NEW_UPDATE_LOADED`); module ordering matched the embedded
bundle (`__r(1), __r(1964), __r(0)`); the missing `payeeHistory` query was a real
bug but not this (v0.2.3 failed identically after deploying it).

The real blocker: **nothing recorded *why* a launch failed.** So
`src/diagnostics/crashRecorder.ts` installs a global error handler that writes the
exception to the app's document directory — which belongs to the *install*, not
the update, and so survives the rollback — and `OtaDiagnostics` reads it back. The
write is synchronous (`FileHandle`) because the handler is racing its own
teardown. The recorder no-ops on web (`expo-file-system` isn't supported there).

That build never reached a device (EAS quota), so the next failure's real
exception is still uncaptured. **If the panel ever shows no crash record, the
update isn't crashing — it's being failed for never signalling "ready" (first
render never completing), which is a different bug.**

## Applying an update — never auto-reload

Separate from *why* updates failed, *how* we applied them caused its own outage.
An early version called `Updates.reloadAsync()` automatically as soon as an update
finished downloading. When the downloaded bundle then failed to launch, the app
reloaded straight back into the failing state — a **boot loop** with no way out.

The rule that came from it: **never reload automatically.** A staged update is
applied only on an explicit user action (the `UpdateBanner` / `CheckForUpdatesRow`
in Settings), the download must complete before any restart, and the user is
prompted to restart rather than dropped. A bad auto-reload is unrecoverable; a
manual one always leaves the working embedded bundle running.

Related, minor: sharing the native update log from the diagnostics panel first
failed because the manifest JSON was ~167KB — past what Android's share intent
accepts. `OtaDiagnostics` now caps lines (300 chars, 60 entries) and hoists
failure lines to the top.

## Where the OTA config lives

- `app.json` → `expo.updates.url` and `runtimeVersion`
- `eas.json` → per-profile `channel` and env
- `metro.config.js` → the `InitializeCore`-first serializer fix (the root cause)
- `package.json` → `update:android` scripts (pin the prod Convex URL inline)
- `src/hooks/useOtaUpdates.ts`, `src/features/UpdateBanner.tsx`,
  `src/features/CheckForUpdatesRow.tsx`, `src/features/OtaDiagnostics.tsx`,
  `src/diagnostics/crashRecorder.ts`

## If OTA is revived

- Build first against the new `runtimeVersion`, install it, *then* publish updates.
- Deploy Convex before any update that calls a new function ([RELEASE.md](RELEASE.md) rule 1).
- The tell for a silent rollback loop: `embedded=true` alongside `failureCount > 0`.
