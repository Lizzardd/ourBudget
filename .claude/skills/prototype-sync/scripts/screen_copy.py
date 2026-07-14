#!/usr/bin/env python3
"""Dump one prototype screen's visible copy, in reading order.

Usage:
    python screen_copy.py "Settings"
    python screen_copy.py --list
    python screen_copy.py "Settings" --find "New category"

Screens in the prototype are marked with `data-screen-label="..."`. Reading a
screen's copy in order is the fastest way to see its true structure — which
cards exist, in what order, and with what labels — without wading through
~100KB of inline styles.

`--find` answers the question that matters most before you add anything:
"which screen does this element actually live in?" Placement is part of the
spec. An element that exists on the Dashboard does not therefore belong in
Settings.
"""

import argparse
import pathlib
import re
import sys

SAVED = pathlib.Path("docs/design/BudgetApp-Prototype.dc.html")
TAG = re.compile(r"<[^>]+>")


def screens(html: str) -> list[tuple[str, int]]:
	return [
		(m.group(1), m.start())
		for m in re.finditer(r'data-screen-label="([^"]+)"', html)
	]


def visible_copy(html: str, start: int, end: int) -> list[str]:
	# `start` points at the data-screen-label attribute, i.e. *inside* the
	# opening tag — so rewind to that tag's `<` or the tail of its attributes
	# leaks through as if it were copy.
	tag_open = html.rfind("<", 0, start)
	text = TAG.sub("\n", html[tag_open if tag_open != -1 else start : end])
	out: list[str] = []
	for line in text.split("\n"):
		line = line.strip()
		# Drop empties, template bindings, and any attribute/CSS residue.
		if not line or line.startswith("{{") or '="' in line:
			continue
		if ":" in line[:14] and ";" in line:
			continue
		out.append(line)
	return out


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument("screen", nargs="?", help='e.g. "Settings", "Dashboard"')
	ap.add_argument("--list", action="store_true", help="List all screen labels.")
	ap.add_argument("--find", help="Report which screen(s) contain this text.")
	args = ap.parse_args()

	if not SAVED.exists():
		print(f"No saved prototype at {SAVED} — pull it first.", file=sys.stderr)
		return 1
	html = SAVED.read_text()
	marks = screens(html)

	if args.list:
		for label in dict.fromkeys(label for label, _ in marks):
			print(" ", label)
		return 0

	if args.find:
		hits = 0
		for m in re.finditer(re.escape(args.find), html):
			owner = "?"
			for label, pos in marks:
				if pos < m.start():
					owner = label
				else:
					break
			ctx = TAG.sub(" ", html[max(0, m.start() - 60) : m.start() + 60])
			print(f"  screen={owner!r:24} …{' '.join(ctx.split())}")
			hits += 1
		if not hits:
			print(f"  {args.find!r} does not appear in the prototype at all.")
			print("  -> Do not add it. If the app needs it, ask the user first.")
		return 0

	if not args.screen:
		ap.error("give a screen name, or --list, or --find")

	for i, (label, pos) in enumerate(marks):
		if label != args.screen:
			continue
		end = marks[i + 1][1] if i + 1 < len(marks) else len(html)
		print(f"=== {label} — visible copy in order ===")
		for line in visible_copy(html, pos, end):
			print("  ", line)
		return 0

	print(f"No screen labelled {args.screen!r}. Use --list to see them.", file=sys.stderr)
	return 1


if __name__ == "__main__":
	sys.exit(main())
