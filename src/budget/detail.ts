/**
 * Pure budget-math module for the category detail screen: the header/limit
 * view-model, limit-editor step math, and transaction-row formatting
 * (payer avatar + relative date). No React Native / Convex imports — inputs
 * are plain data, fed later by Convex query results.
 */

import { fmt, fmtN, glyph } from './money';
import { status } from './status';
import { monthLabel } from './periods';

export interface DetailCategory {
	id: string;
	emoji: string;
	name: string;
	color: string;
	period: 'monthly' | 'annual';
	limit: number;
}

export interface CategoryDetailVM {
	id: string;
	emoji: string;
	name: string;
	isAnnual: boolean;
	periodLabel: string;
	amtFmt: string;
	ofFmt: string;
	pctW: string;
	bar: { from: string; to: string | null };
	sub1: string;
	sub2: string;
	subColor: string;
	limitLabel: string;
	limitFmt: string;
	limitVal: string;
	curSym: string;
	addLabel: string;
}

export interface TxnRowVM {
	id: string;
	amtFmt: string;
	note: string;
	whoInitial: string;
	whoBg: string;
	whoColor: string;
	meta: string;
}

/** Monthly limit-editor step, in minor units (100 AED). */
export const LIMIT_STEP_MONTHLY = 10000;
/** Annual limit-editor step, in minor units (500 AED). */
export const LIMIT_STEP_ANNUAL = 50000;

/** The limit-editor step for a category's period, in minor units. */
export function limitStep(period: 'monthly' | 'annual'): number {
	return period === 'annual' ? LIMIT_STEP_ANNUAL : LIMIT_STEP_MONTHLY;
}

/**
 * Bumps a limit (minor units) by one step in `dir` (+1 or -1), floored at
 * one step so the limit never reaches zero or goes negative — mirrors the
 * prototype's `bumpLimit`.
 */
export function bumpLimit(limitMinor: number, period: 'monthly' | 'annual', dir: 1 | -1): number {
	const step = limitStep(period);
	return Math.max(step, limitMinor + dir * step);
}

/**
 * "Monthly budget · <Month Year>" or "Annual budget · Jan – Dec <Year>" —
 * copy verbatim from the prototype's `det.periodLabel`.
 */
export function periodLabel(period: 'monthly' | 'annual', year: number, month: number): string {
	if (period === 'annual') {
		return 'Annual budget · Jan – Dec ' + year;
	}
	return 'Monthly budget · ' + monthLabel(year, month);
}

/**
 * Builds the category-detail header/card view-model: amount/limit copy,
 * progress-bar width and colors, and the limit-editor labels — all derived
 * from `status()` so the bands (good/warn/over) stay in one place with the
 * Home cards.
 *
 * `mounted` controls the progress-bar width the same way `toCategoryCard`
 * does: while false (pre-mount), the width is always '0%'.
 */
export function toCategoryDetail(
	cat: DetailCategory,
	spentMinor: number,
	cur: string,
	mounted: boolean,
	year: number,
	month: number
): CategoryDetailVM {
	const isAnnual = cat.period === 'annual';
	const st = status(spentMinor, cat.limit, isAnnual, cur);
	const pct = mounted ? Math.max(0, Math.min(100, Math.round(st.pct * 100))) : 0;
	const suffix = isAnnual ? ' this year' : ' this month';

	return {
		id: cat.id,
		emoji: cat.emoji,
		name: cat.name,
		isAnnual,
		periodLabel: periodLabel(cat.period, year, month),
		amtFmt: fmt(spentMinor, cur),
		ofFmt: 'of ' + fmtN(cat.limit) + suffix,
		pctW: pct + '%',
		bar: { from: st.barFrom, to: st.barTo },
		sub1: st.sub1,
		sub2: st.sub2,
		subColor: st.subColor,
		limitLabel: isAnnual ? 'ANNUAL LIMIT' : 'MONTHLY LIMIT',
		limitFmt: fmt(cat.limit, cur),
		limitVal: fmtN(cat.limit),
		curSym: glyph(cur),
		addLabel: '+ Add to ' + cat.name,
	};
}

/**
 * Payer avatar colors, matching the prototype's rule: Sara's avatar uses
 * the household's profile color (pink), every other payer uses the fixed
 * teal (`#7FA8A0`). Text color follows suit (dark pink / dark teal).
 */
export function payerAvatar(payerName: string): { bg: string; color: string; initial: string } {
	const isSara = payerName === 'Sara';
	const initial = (payerName.trim()[0] || '?').toUpperCase();
	return {
		bg: isSara ? '#D98BA4' : '#7FA8A0',
		color: isSara ? '#3A1220' : '#0F2B26',
		initial,
	};
}

/**
 * Formats a transaction's `spentAt` (ms) relative to `nowMs`: "Today" or
 * "Yesterday" for the current/previous calendar day, otherwise "MMM D"
 * (e.g. "Jun 3"). Day boundaries use the local calendar day.
 */
export function formatTxnDate(spentAtMs: number, nowMs: number): string {
	const spent = new Date(spentAtMs);
	const now = new Date(nowMs);

	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayDiff = Math.round((startOfDay(now) - startOfDay(spent)) / 86400000);

	if (dayDiff === 0) {
		return 'Today';
	}
	if (dayDiff === 1) {
		return 'Yesterday';
	}
	const month = spent.toLocaleString('en-US', { month: 'short' });
	return month + ' ' + spent.getDate();
}

/** The subset of a Convex transaction document the detail row needs. */
export interface DetailTransaction {
	_id: string;
	amount: number;
	note: string;
	payerName: string;
	spentAt: number;
}

/**
 * Maps a transaction to its detail-row view-model: amount, note, payer
 * avatar, and the "<Payer> · <when>" meta line — copy verbatim from the
 * prototype's `det.txns` mapper.
 */
export function toTxnRow(txn: DetailTransaction, cur: string, nowMs: number): TxnRowVM {
	const avatar = payerAvatar(txn.payerName);
	const when = formatTxnDate(txn.spentAt, nowMs);

	return {
		id: txn._id,
		amtFmt: fmt(txn.amount, cur),
		note: txn.note,
		whoInitial: avatar.initial,
		whoBg: avatar.bg,
		whoColor: avatar.color,
		meta: txn.payerName + ' · ' + when,
	};
}
