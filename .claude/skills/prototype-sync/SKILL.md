---
name: prototype-sync
description: Pull the latest claude.ai/design prototype and implement its changes faithfully in this Expo/React Native app. Use this whenever the user says the prototype changed, asks to pull/recheck/sync the prototype or design, says something "doesn't match the prototype", or reports a UI element that looks wrong. Also use it before adding ANY new UI to a screen the prototype covers, since the prototype — not your judgement — decides what exists and where.
---

# Prototype → implementation sync

The prototype is the **source of truth** for this app's UI. It lives in a
claude.ai/design project and is pulled with the `DesignSync` tool:

- projectId: `52e5a729-f2d3-4bfb-bc2a-dccd153bfa0e`
- path: `BudgetApp Prototype.dc.html`
- saved copy in-repo: `docs/design/BudgetApp-Prototype.dc.html`

Your job is to make the app match it. Not to improve on it, not to fill in
gaps you think it left.

## Why this skill exists

Two failure modes have cost real time on this project, and both come from the
same root: treating the prototype as inspiration rather than specification.

1. **Inventing UI that was never in the design.** A "New category" row was
   added to Settings, and a separate "PROFILE" card above MEMBERS. Neither
   existed in the prototype. Both shipped, both were spotted by the user, and
   both had to be ripped out. If it isn't in the prototype, it doesn't exist.

2. **Eyeballing styling instead of reading the markup.** "Manage" was built as
   a grey pill button; in the prototype it is `background: none` accent text.
   "Sign Out" was lowercase; the prototype says `Sign Out`. Section headers had
   the wrong casing. Screenshots hide this — the markup doesn't.

The prototype is a rendered HTML file. Everything you need is *in the file*.
Read it.

## The workflow

### 1. Pull and diff

Fetch the file with `DesignSync(get_file)`. The result is large and gets
persisted to a tool-results file rather than shown inline — that's fine, you
want to diff it, not read it.

Then run the bundled script, which extracts the content from the tool-result
JSON, diffs it against the saved copy, prints the changed lines, and updates
the saved copy:

```bash
python .claude/skills/prototype-sync/scripts/diff_prototype.py <tool-result-file>
```

If the diff is empty, say so and stop. Nothing to do.

**Read the `->` pairs, not just the line.** Every element in this prototype is a
single very long line, so a changed line is echoed truncated, and the fragments
that actually changed are listed beneath it. Trusting the truncated line is how
the FAB's label going from "Add expense" to "Add" was missed — it sat at the end
of a ~700-char line, past the cut. The `->` pairs are the change; the line is
only there to locate it.

### 2. Triage the diff — most of it is noise

The prototype carries its own **demo data**: fake households ("The Al-Marri
Home"), mock members, `MCATS` / `ACATS` / `MONTHS` / `TXNS` arrays, sample
transactions, a hardcoded `versionLabel`. This app has real data from Convex,
so **none of that is a design change**. Skip it.

What *is* a design change:
- markup structure (cards added/removed/merged, elements moved between screens)
- styling (colors, sizes, weights, radii, padding, heights)
- copy and its casing
- new interactions (`onClick` handlers, new `sc-if` states)

A diff of 90 lines is routinely 80 lines of demo data and 10 lines that matter.
Separating them first is what stops you implementing fake households.

### 3. Read the actual markup for anything you're changing

Before writing a component, look at how the prototype builds it. Use the
bundled script to dump a screen's visible copy in reading order — this is the
fastest way to see structure and ordering:

```bash
python .claude/skills/prototype-sync/scripts/screen_copy.py "Settings"
```

Then grep the file for the specific element to get its exact styling:

```bash
grep -o 'onClick="{{ openManage }}".\{0,200\}' docs/design/BudgetApp-Prototype.dc.html
```

That is how you learn `Manage` is `background: none; color: var(--accent);
font-size: 13px; font-weight: 800` with the label `Manage ›` — a text link, not
a button. Guessing this from a screenshot is how you get it wrong.

**Placement is part of the spec.** Before adding an element, search the whole
file for it and see which screen it actually lives in:

```bash
grep -n "New category" docs/design/BudgetApp-Prototype.dc.html
```

`+ New category` appears only on the Dashboard. It is not in Settings. That one
grep would have prevented a bug that survived several releases.

### 4. Map the prototype's idioms

The prototype is a small reactive HTML dialect. Translate, don't copy:

| Prototype | React Native |
|---|---|
| `<sc-for list="{{ items }}" as="i">` | `items.map((i) => ...)` |
| `<sc-if value="{{ flag }}">` | `{flag ? ... : null}` |
| `{{ binding }}` | props / state / hook values |
| `style-active="opacity: 0.6"` | `style={({ pressed }) => pressed && ...}` |
| `var(--accent, #C96287)` | `useTheme().accent` |
| `env(safe-area-inset-*)` | `useSafeAreaInsets()` |
| Material Symbols `<span>` glyph | `<Icon name="..." />` |

Use the existing theme (`useTheme()` → `{ t, accent }`) and `fontFamily(weight)`
rather than hardcoding the prototype's hex values — the tokens already encode
them, and hardcoding breaks the light theme.

### 5. Verify before claiming it's done

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm exec expo export -p web
```

All three must pass. `tsc` alone is not enough — it won't catch a component
that throws at render.

### 6. Check the prototype's demo data has not become real logic

This is the inverse of "don't invent UI", and it is easy to miss because the
diff never points at it. The prototype ships fake people — `Sara`, `Omar`, "The
Al-Marri Home" — and it is tempting to translate their *behaviour* literally.

That is exactly what happened: `payerAvatar()` in `src/budget/detail.ts`
hardcoded `payerName === 'Sara'` to choose an avatar colour, so in the real app
every actual member fell through to the same fallback and nobody's profile
colour ever appeared. The Add-expense sheet likewise shipped a hardcoded
`Sara` / `Omar` payer toggle.

After any sync, grep the real source for the prototype's demo values:

```bash
grep -rn "'Sara'\|'Omar'\|Al-Marri" src/ app/ convex/ --include=*.ts --include=*.tsx
```

Anything outside a test fixture is a bug. The prototype's demo names stand in
for *whatever the household actually contains* — resolve them from real data
(`useHouseholdMembers()`), never by name.

Be equally suspicious of any code that **duplicates** the prototype's UI with
its own mock data. Such a mirror drifts silently on every design change and is
where demo data goes to hide. (A `app/preview/*` screenshot harness did exactly
this and was deleted.)

## Things that will bite you

**Don't chase the running app.** If the user reports the UI looks stale, don't
spend turns theorising about Metro caches or which bundle is live. Fix the code
and let them run it. Time spent debugging *their* running instance instead of
the source is time wasted — the user has said so explicitly.

**Copy is not approximate.** `Sign Out` ≠ `Sign out`. `This Month` /
`Resets Monthly` are title case in the design. If you're typing a user-visible
string, copy it out of the prototype rather than from memory.

**A removed element is a change too.** When the prototype drops a card or moves
it into another card, delete or move ours. Merging two cards into one (as
Settings' `APPEARANCE` card did) means *one* card in our code, not two that
happen to look similar.

**When the user overrides the prototype, honour the user — and say so.** They
asked for the version string on its own line under `ourbudget.`; the prototype
still has it inline. The user's instruction wins, but flag the deviation so it
isn't mistaken for an oversight later.

**If the prototype seems to be missing something the app genuinely needs**
(authorization rules, error states, empty states), don't silently invent UI for
it. Implement the behaviour, and tell the user what you added and why.

## Reporting back

Lead with what changed in the design, not with what you did. The user knows the
prototype; they want to know which parts of it moved. Then list the files. Then
the verification result. Flag anything you deviated on.
