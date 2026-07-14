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
MAX_LINE = 240


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

	diff = list(difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm="", n=0))
	removed = [l for l in diff if l.startswith("-") and not l.startswith("---")]
	added = [l for l in diff if l.startswith("+") and not l.startswith("+++")]

	print(f"\nCHANGED: {len(added)} added / {len(removed)} removed\n")
	print("=== REMOVED ===")
	for line in removed:
		print(line[:MAX_LINE])
	print("\n=== ADDED ===")
	for line in added:
		print(line[:MAX_LINE])

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
