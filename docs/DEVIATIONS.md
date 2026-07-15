# Deliberate deviations from the prototype

The [prototype](design/BudgetApp-Prototype.dc.html) is the source of truth for the
UI. Where we knowingly depart from it, it's recorded here so a future
`/prototype-sync` doesn't "restore" the difference as a bug.

## Amount uses the OS keypad, not the prototype's custom numpad

The prototype specifies a custom on-screen numpad grid for the amount field, and
the designer recently *compacted* it rather than removing it — so it's a live
design choice, not an oversight. We removed it anyway, on the maintainer's
explicit instruction, and the amount is a normal `TextInput` that summons the OS
keyboard.

**Why:** the Add-expense sheet had two competing input mechanisms. The amount used
an always-visible custom numpad, while "Where?" and "Add a note" are real text
fields that summon the OS keyboard — so on a phone both fought for the same
vertical space, which is what forced the keyboard-avoidance work. The prototype
never feels this, because in a browser every field (including
`<input type="date">`) uses the same native chrome. One keyboard per sheet.

Worth raising with the designer rather than leaving the app and the design
permanently disagreeing.

## Web amount field is sized/styled for `<input>`

On web, react-native-web renders the amount `TextInput` as an `<input>`, which
stretched to fill the row and drew a focus ring when autofocused. The amount field
has web-only style (content-based width, `outlineStyle: 'none'`) so it matches the
native look. Native is untouched. This isn't a design change — it's making one
design render correctly on both platforms.
