# TODO

Open work, ordered by how much it hurts. Background and how-to live in
[docs/](docs/) — this file is just the list.

Legend: **P1** ships a lie to the user · **P2** correctness / hygiene ·
**P3** nice to have

---

## P1 — UI that promises something it doesn't do

- [ ] **Notification toggles are inert.** Settings offers *Weekly check-in*,
  *Over-budget nudges*, and *Monthly recap email*. There is no
  `expo-notifications`, no scheduling, and no push/email anywhere — the toggles
  write a flag to Convex that nothing reads. The Monday banner is in-app only.
  Either implement them or stop showing them. **Biggest remaining lie in the UI.**
- [ ] **Apple sign-in** is a disabled "coming soon" button on the welcome screen —
  implement or remove it.
- [ ] **SMS ingestion.** `transactions.source` allows `"sms"` and there's a `raw`
  field, but nothing ingests SMS. Implement it or drop the union member.

## P2 — Correctness & hygiene

- [ ] **Remove the OTA diagnostics panel.** `OtaDiagnostics` (Show/Share update
  logs at the bottom of Settings) was debug UI; it did its job. Removing it is
  also a low-risk exercise of the flow. Context: [docs/OTA.md](docs/OTA.md).

## P3 — Nice to have / untested

- [ ] **iOS has never been built or run.** The keyboard-avoidance path, Apple
  auth, and safe areas are all unexercised.
- [ ] **Google OAuth consent screen shows `shiny-scorpion-150.convex.site`.** Set
  an App name ("Our Budget") + logo on the Google OAuth consent screen for a
  friendly label. See the note in [docs/WEB-HOSTING.md](docs/WEB-HOSTING.md).
- [ ] **OTA is unproven on the current runtime.** Deferred — Android is sideloaded
  for now, so OTA isn't on the critical path. Full context and the revival plan:
  [docs/OTA.md](docs/OTA.md).
