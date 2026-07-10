import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

import { AddExpenseSheet } from './AddExpenseSheet';

export interface AddExpenseContextValue {
	/** Opens the Add-Expense sheet, optionally pre-selecting a category. */
	open: (categoryId?: string) => void;
}

const AddExpenseContext = createContext<AddExpenseContextValue | undefined>(undefined);

/**
 * Mounts the single, app-wide `AddExpenseSheet` and exposes `open()` to the
 * rest of the tree via `useAddExpenseSheet()`. Both the FAB and the
 * category-detail "+ Add to <name>" button call `open()` — the latter
 * passing its category id so the sheet opens pre-selected.
 */
export function AddExpenseProvider({ children }: { children: ReactNode }) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [initialCategoryId, setInitialCategoryId] = useState<string | undefined>(undefined);

	const open = useCallback((categoryId?: string) => {
		setInitialCategoryId(categoryId);
		setSheetOpen(true);
	}, []);

	const close = useCallback(() => setSheetOpen(false), []);

	const value = useMemo<AddExpenseContextValue>(() => ({ open }), [open]);

	return (
		<AddExpenseContext.Provider value={value}>
			{children}
			<AddExpenseSheet open={sheetOpen} onClose={close} initialCategoryId={initialCategoryId} />
		</AddExpenseContext.Provider>
	);
}

/** Reads the Add-Expense open trigger from context. Must be used within an `AddExpenseProvider`. */
export function useAddExpenseSheet(): AddExpenseContextValue {
	const ctx = useContext(AddExpenseContext);
	if (!ctx) {
		throw new Error('useAddExpenseSheet must be used within an AddExpenseProvider');
	}
	return ctx;
}
