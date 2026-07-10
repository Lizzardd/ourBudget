import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

import {
	MonthTransactionsSheet,
	type MonthTransactionsSheetParams,
} from './MonthTransactionsSheet';

export interface MonthTransactionsContextValue {
	/** Opens the Month Transactions sheet for a category + date range. */
	open: (params: MonthTransactionsSheetParams) => void;
}

const MonthTransactionsContext = createContext<MonthTransactionsContextValue | undefined>(
	undefined
);

/**
 * Mounts the single, app-wide `MonthTransactionsSheet` and exposes `open()`
 * to the rest of the tree via `useMonthTransactionsSheet()`. Reports'
 * trend/category/annual rows call `open()` with the category and the date
 * range to show (a month range for monthly categories, a year range for
 * annual ones — see `src/budget/periods.ts`).
 */
export function MonthTransactionsProvider({ children }: { children: ReactNode }) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [params, setParams] = useState<MonthTransactionsSheetParams | null>(null);

	const open = useCallback((next: MonthTransactionsSheetParams) => {
		setParams(next);
		setSheetOpen(true);
	}, []);

	const close = useCallback(() => setSheetOpen(false), []);

	const value = useMemo<MonthTransactionsContextValue>(() => ({ open }), [open]);

	return (
		<MonthTransactionsContext.Provider value={value}>
			{children}
			<MonthTransactionsSheet open={sheetOpen} onClose={close} params={params} />
		</MonthTransactionsContext.Provider>
	);
}

/** Reads the Month Transactions open trigger from context. Must be used within a `MonthTransactionsProvider`. */
export function useMonthTransactionsSheet(): MonthTransactionsContextValue {
	const ctx = useContext(MonthTransactionsContext);
	if (!ctx) {
		throw new Error('useMonthTransactionsSheet must be used within a MonthTransactionsProvider');
	}
	return ctx;
}
