# TODO

Open work, ordered by how much it hurts. Background and how-to live in
[docs/](docs/) — this file is just the list.

Legend: **P1** ships a lie to the user · **P2** correctness / hygiene ·
**P3** nice to have

---

## P1 — UI that promises something it doesn't do

- [x] ~~Notification toggles are inert.~~ **Now shown disabled** (opacity 0.45,
  non-interactive, per the prototype), so the UI no longer promises notifications
  the app doesn't send. There's still no `expo-notifications`/push/email — real
  notifications are future work (P3 below).
- [x] ~~Apple sign-in is a disabled button.~~ **Now a static "Apple · COMING SOON"
  pill** on the welcome screen — honest, not tappable. Real Apple auth is still
  unimplemented (P3 below).
- [ ] **SMS ingestion.** `transactions.source` allows `"sms"` and there's a `raw`
  field, but nothing ingests SMS. Implement it or drop the union member.

## P2 — Correctness & hygiene

- [x] ~~Remove the OTA diagnostics panel.~~ **Kept, now developer-gated.**
  `OtaDiagnostics` renders only when `api.account.isDeveloper` returns true — a
  server-side check against the verified auth email (allowlist in
  `convex/account.ts`). Invisible and inert for everyone else. Context:
  [docs/OTA.md](docs/OTA.md).

## P3 — Nice to have / untested

- [ ] **Real notifications** — push and/or the weekly recap email. The Settings
  toggles are disabled until this exists (see P1).
- [ ] **Apple sign-in** — implement the real flow (currently a "coming soon" pill).
- [ ] **iOS has never been built or run.** The keyboard-avoidance path, Apple
  auth, and safe areas are all unexercised.
- [ ] **Google OAuth consent screen shows `shiny-scorpion-150.convex.site`.** Set
  an App name ("Our Budget") + logo on the Google OAuth consent screen for a
  friendly label. See the note in [docs/WEB-HOSTING.md](docs/WEB-HOSTING.md).
- [ ] **OTA is unproven on the current runtime.** Deferred — Android is sideloaded
  for now, so OTA isn't on the critical path. Full context and the revival plan:
  [docs/OTA.md](docs/OTA.md).
