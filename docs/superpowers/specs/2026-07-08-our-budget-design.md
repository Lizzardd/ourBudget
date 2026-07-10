# Our Budget — Design Spec

**Date:** 2026-07-08
**Status:** Approved (brainstorming) — implementation via companion plan.

## What we're building
A **shared household budgeting app** — one pooled budget that every member of a household sees live. Mobile-first, shipped as an installable **PWA first**, then Android and (later) iOS, from a **single Expo / React Native codebase**. Backend is **Convex** (realtime DB + functions + auth).

Visual + interaction source of truth: [`docs/design/BudgetApp-Prototype.dc.html`](../../design/BudgetApp-Prototype.dc.html) (a claude.ai/design prototype). The plan reproduces it faithfully.

## Product decisions (from brainstorming)
- **Shared model:** common pooled budget — one household wallet, transparent to all members.
- **Budget method:** per-category limits with progress bars. Categories are either:
  - **monthly** — reset on the 1st; progress = spend this month ÷ limit.
  - **annual** — accumulate year-to-date against a yearly ceiling; do NOT reset monthly.
- **Data entry:** manual quick-add (numpad sheet). The transaction model reserves a `source` field (`'manual'` now, `'sms'` later) and a nullable `raw` field so an **Android-only** SMS/notification parser can be added in a later phase. SMS import is impossible on PWA/iOS and Play-restricted on Android — explicitly out of scope now.
- **Auth & join:** Google (and Apple when iOS lands). One member creates a household → gets an invite code; others join by code.
- **Currency:** single currency per household, **AED default** (rendered as the glyph `Đ`), switchable to USD/GBP/EUR/ZAR. Amounts stored as **integer minor units (fils, ×100)**.
- **v1 history:** per-month budgets with look-back; annual categories tracked across the year.
- **v1 reports:** spend-by-category, month-over-month trend, annual pace.

## Milestone 1 scope
**The full prototype, wired to real Convex + auth.** That includes: onboarding (welcome/fork/invite/join), tabs Home / Reports / History / Settings, three Home layouts (cozy-cards / grid / compact), category-detail overlay, add-expense sheet, profile overlay, in-app new-category creation, settings (theme, currency, layout, notification prefs), toast, plus the Monday notification and weekly check-in.

**Honest boundary:** the Monday notification and weekly check-in are **in-app, data-driven UI** (as the prototype simulates them). Real OS push notifications and scheduled recap emails are a **later phase**, not part of M1.

## Brand & theme (from prototype + branding doc)
- App name: **Our Budget**. Font: **DM Sans**.
- Accent: `#C96287` (rose). Warm **dark theme default**, warm **light mode** available.
- Status colors: on-track green `#86B478`/`#8FBF7E`; nearly-there amber `#E3A55C`/`#E3B063`; over-budget warm gradient `#E3A55C→#DD7A5E` with encouraging copy ("… over — it happens 💛").
- Dark tokens: bg `#17120E`, card `#221B16`, elevated `#2D251F`, text `#F6EDE3`, sub `#B5A493`.
- Light tokens: bg `#F7F0E6`, card `#FFFDF9`, elevated `#F0E5D6`, text `#37291F`, sub `#8A7663`.
- Tone: warm, calm, encouraging, never judgmental.

## Sample seed data (household "The Al-Marri Home"; members Sara & Omar)
- Monthly categories: 🛒 Groceries 2500, 🍽️ Dining out 1200, 🚕 Transport 600, 🧸 Kids 900, 🏠 Housing 6000, ✨ Everything else 800.
- Annual categories: 🔧 Household maintenance 12000, 🚗 Car service 4000, 🎁 Gifts 6000.
- Plus the transaction lists in the prototype's `TXNS` map.

## Out of scope (later phases)
Real push/email notifications, SMS/notification parsing (Android), multiple wallets/accounts, income tracking, multi-currency-per-household, receipt capture/OCR.
