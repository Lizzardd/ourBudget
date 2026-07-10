# Claude Design prompt — Household Budget app

> Paste everything below the line into claude.ai/design. Tweak the sample data or wording as you like.

---

Design a **shared household budgeting app** — mobile-first, meant to run as an installable PWA and later as native Android/iOS (React Native / Expo). Design at **phone width (~390px)**; everything should feel like a real native app, not a website.

**Who it's for:** a couple / household who share one pooled budget. Everyone sees the same live numbers. Money is a stressful topic, so the app should feel **warm, calm, and encouraging — never judgmental**, even when someone is over budget.

**Currency is AED** (UAE dirham). Show amounts like `AED 1,250` or `1,250 AED`. Use realistic Dubai-household numbers.

## Visual direction — warm & friendly
- **Palette:** warm and inviting, not corporate-blue. Think soft terracotta / warm coral as the primary accent, warm off-white / cream backgrounds, a friendly green for "on track" and a soft amber→warm-red for "over budget" (never a harsh alarm red). Support a cozy dark mode too.
- **Shape:** generously rounded corners, soft cards with gentle shadows, pill-shaped buttons and chips. Nothing sharp or clinical.
- **Type:** a friendly, rounded, highly legible sans-serif. Big, confident numbers for amounts. Relaxed, human micro-copy ("You've got AED 800 left for groceries 🎉", "Nearly there — AED 120 left this month").
- **Motion:** progress bars/rings fill smoothly; adding an expense feels satisfying and quick.
- **Iconography:** simple, rounded, a little playful. Each category has a color + emoji/icon.

## Core concept the UI must express
Each **category** has a monthly OR an annual spending limit:
- **Monthly categories** (Groceries, Dining out, Fuel, Kids) reset every month — show *spent this month ÷ monthly limit*.
- **Annual categories** (Household maintenance, Car service, Gifts) accumulate across the whole year against one yearly ceiling and do NOT reset monthly — show *spent year-to-date ÷ annual limit*, and make it visually clear this is an annual bucket.

## Screens to design

1. **Onboarding / sign-in** — warm welcome, one-line value prop, big "Continue with Google" and "Continue with Apple" buttons. Then a fork: *Create a household* or *Join with a code*. Show the invite-code share screen (a friendly code like `SUNNY-42` with a Share button).

2. **Dashboard (this month)** — the home screen. At the top, a warm summary ("AED 6,420 spent of AED 9,000 this month" with an overall progress ring). Below, a scrollable list of **category cards**, each with its emoji/color, name, spent-vs-limit, and a progress bar. Monthly and annual categories are visually distinguishable (e.g. an "annual" tag on the yearly ones). One or two categories should be **over budget** to show the warm-not-harsh over-limit state. A prominent floating **"+ Add expense"** button.

3. **Add expense** (bottom sheet or full screen) — fast entry: a big number pad / amount field, category picker (colorful chips), optional note, date (defaults to today), and who paid. Confirming animates it into the list. Keep it to as few taps as possible.

4. **Category detail** — one category's progress, its recent transactions (each showing amount, note, who added it, date), and an edit-limit control.

5. **Reports** — a friendly charts screen: spend-by-category for the selected month (a warm donut or horizontal bars), a month-over-month trend, and a dedicated **annual view** showing year-to-date drawdown on the annual categories.

6. **History** — a month switcher (‹ June 2026 ›) that reloads the dashboard for past months, so members can look back.

## Sample data (use this to make it feel real)
Household: "The Al-Marri Home". Members: Sara & Omar.
Monthly categories: 🛒 Groceries (AED 2,500), 🍽️ Dining out (AED 1,200 — currently AED 1,340, slightly over), ⛽ Fuel (AED 600), 🧸 Kids (AED 900), 🏠 Rent (AED 6,000).
Annual categories: 🔧 Household maintenance (AED 12,000/yr, AED 4,300 used YTD), 🚗 Car service (AED 4,000/yr, AED 1,850 used YTD), 🎁 Gifts (AED 6,000/yr, AED 2,100 used YTD).
Recent transactions: "Carrefour AED 320 · Sara · today", "Shell fuel AED 180 · Omar · yesterday", "Plumber AED 450 · Omar · 3 days ago".

## Priorities
- The **dashboard** and **add-expense** flow matter most — nail those first.
- Make it feel effortless and reassuring. A household should *enjoy* opening this.
- Design light and dark themes.
