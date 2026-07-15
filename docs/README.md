# Docs

Reference material for **Our Budget**. Start with the top-level
[README.md](../README.md) for the project overview and quickstart.

## Index

| Doc | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The stack, where things live, and the conventions/invariants that are easy to get wrong (money in minor units, 0-based months, prototype-as-source-of-truth, platform-split files, the auth flow). Read this first. |
| [RELEASE.md](RELEASE.md) | How to build, deploy, and ship — backend, web, and Android — plus the ordering rules that must hold and where each piece runs. |
| [WEB-HOSTING.md](WEB-HOSTING.md) | The Cloudflare Pages setup behind https://ob.lizzardd.link and how to redo it. |
| [OTA.md](OTA.md) | Post-mortem of the over-the-air update saga and the one lesson from it. OTA is not currently used (Android is sideloaded). |
| [DEVIATIONS.md](DEVIATIONS.md) | Where we knowingly depart from the prototype, and why. |

## Design source of truth

- `design/BudgetApp-Prototype.dc.html` — the saved claude.ai/design prototype.
  **It decides what UI exists and where.** Sync it with the `/prototype-sync`
  skill.
- `claude-design-prompt.md` — the prompt used to drive the design agent.

## Historical

- `superpowers/specs/` and `superpowers/plans/` — the original design spec and
  implementation plan the app was built from. Kept for provenance; not
  maintained.

## Open work

Actionable gaps and follow-ups live in [../TODO.md](../TODO.md) — a plain
prioritized list. Longer-form context for anything there points back into these
docs.
