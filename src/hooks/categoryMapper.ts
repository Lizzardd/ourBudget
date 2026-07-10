import type { CardCategory } from '../budget/cards';
import type { ReportCategory } from '../budget/reports';

/** The subset of a Convex category document the pure budget modules need. */
export interface ConvexCategory {
	_id: string;
	emoji: string;
	name: string;
	color: string;
	period: 'monthly' | 'annual';
	limit: number;
}

/**
 * Maps a Convex category document to the pure-module input shape shared by
 * `cards.ts` and `reports.ts` — both expect `{id, emoji, name, color,
 * period, limit}`, differing only in field name (`id` vs `_id`).
 */
export function toBudgetCategory(cat: ConvexCategory): CardCategory & ReportCategory {
	return { id: cat._id, emoji: cat.emoji, name: cat.name, color: cat.color, period: cat.period, limit: cat.limit };
}
