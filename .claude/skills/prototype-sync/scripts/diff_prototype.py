#!/usr/bin/env python3
"""Diff a freshly pulled prototype against the saved copy, then save it.

Usage:
    python diff_prototype.py <designsync-tool-result.json> [--no-save]

`DesignSync(get_file)` returns a JSON blob whose `content` field holds the
prototype HTML. When the file is large the harness persists that blob to a
tool-results file instead of showing it inline, so this script takes that path
and does the extraction itself — the raw HTML never has to enter context.

It prints only the changed lines. The prototype is ~100KB and almost all of it
is unchanged on any given pull, so printing the whole thing (or even a full
unified diff) buries the handful of lines that actually matter.
"""

import argparse
import difflib
import json
import pathlib
import sys

SAVED = pathlib.Path("docs/design/BudgetApp-Prototype.dc.html")

# How much of a changed line to echo for context. The real content is the
# intra-line diff below — this is only there to locate the line.
CONTEXT_CHARS = 150


def intraline(old: str, new: str) -> list[str]:
    """The fragments that actually differ between two versions of a line.

    Every element in this prototype is a single very long line, so truncating a
    changed line to N characters silently drops whatever changed past N. That is
    not hypothetical: it hid the FAB's label changing from "Add expense" to
    "Add", because the label sits at the END of a ~700-char line and the diff cut
    it off. The change was in the output, just beyond the truncation.

    So instead of trusting a prefix, report the differing fragments themselves —
    however far into the line they sit.
    """
    out: list[str] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, old, new).get_opcodes():
        if tag == "equal":
            continue
        was, now = old[i1:i2].strip(), new[j1:j2].strip()
        if was or now:
            out.append(f"      {was!r}  ->  {now!r}")
    return out


def load_pulled(path: pathlib.Path) -> str:
	"""Pull the HTML out of the DesignSync tool result (or a raw .html file)."""
	raw = path.read_text()
	try:
		return json.loads(raw)["content"]
	except (json.JSONDecodeError, KeyError, TypeError):
		# Already raw HTML.
		return raw


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument("tool_result", type=pathlib.Path)
	ap.add_argument(
		"--no-save",
		action="store_true",
		help="Diff only; leave the saved copy untouched.",
	)
	args = ap.parse_args()

	new = load_pulled(args.tool_result)
	old = SAVED.read_text() if SAVED.exists() else ""

	print(f"saved copy : {len(old):>7} bytes")
	print(f"pulled     : {len(new):>7} bytes")

	if old == new:
		print("\nIDENTICAL — no prototype changes. Nothing to implement.")
		return 0

	old_lines, new_lines = old.splitlines(), new.splitlines()
	sm = difflib.SequenceMatcher(None, old_lines, new_lines)

	n_added = n_removed = 0
	blocks: list[str] = []

	for tag, i1, i2, j1, j2 in sm.get_opcodes():
		if tag == "equal":
			continue
		was, now = old_lines[i1:i2], new_lines[j1:j2]
		n_removed += len(was)
		n_added += len(now)

		if tag == "replace" and len(was) == len(now):
			# Same number of lines: show what changed WITHIN each one. This is the
			# only view that survives this file's very long lines.
			for a, b in zip(was, now):
				blocks.append(f"  ~ {b[:CONTEXT_CHARS].strip()}…")
				blocks.extend(intraline(a, b))
		else:
			for line in was:
				blocks.append(f"  - {line[:CONTEXT_CHARS].strip()}…")
			for line in now:
				blocks.append(f"  + {line[:CONTEXT_CHARS].strip()}…")

	print(f"\nCHANGED: {n_added} added / {n_removed} removed")
	print("(`~` = line edited in place; the `->` pairs under it are the actual change)\n")
	for block in blocks:
		print(block)

	if not args.no_save:
		SAVED.parent.mkdir(parents=True, exist_ok=True)
		SAVED.write_text(new)
		print(f"\nSaved new copy -> {SAVED}")

	print(
		"\nNOTE: much of this is usually the prototype's own DEMO DATA "
		"(mock households, MCATS/ACATS/MONTHS/TXNS, sample members, versionLabel). "
		"That is not a design change — triage it out before implementing."
	)
	return 0


if __name__ == "__main__":
	sys.exit(main())
