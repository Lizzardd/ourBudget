import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

import { AddExpenseSheet, type EditableTransaction } from './AddExpenseSheet';

export interface AddExpenseContextValue {
	/** Opens the Add-Expense sheet, optionally pre-selecting a category. */
	open: (categoryId?: string) => void;
	/** Opens the same sheet in edit mode for an existing transaction. */
	openEdit: (txn: EditableTransaction) => void;
}

const AddExpenseContext = createContext<AddExpenseContextValue | undefined>(undefined);

/**
 * Mounts the single, app-wide `AddExpenseSheet` and exposes `open()` /
 * `openEdit()` to the rest of the tree via `useAddExpenseSheet()`. Both the
 * FAB and the category-detail "+ Add to <name>" button call `open()` — the
 * latter passing its category id so the sheet opens pre-selected. Tapping an
 * editable transaction row calls `openEdit(txn)`, which reopens the same
 * sheet in the prototype's `isEditing` mode.
 */
export function AddExpenseProvider({ children }: { children: ReactNode }) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [initialCategoryId, setInitialCategoryId] = useState<string | undefined>(undefined);
	const [editTxn, setEditTxn] = useState<EditableTransaction | null>(null);

	const open = useCallback((categoryId?: string) => {
		setEditTxn(null);
		setInitialCategoryId(categoryId);
		setSheetOpen(true);
	}, []);

	const openEdit = useCallback((txn: EditableTransaction) => {
		setInitialCategoryId(undefined);
		setEditTxn(txn);
		setSheetOpen(true);
	}, []);

	const close = useCallback(() => setSheetOpen(false), []);

	const value = useMemo<AddExpenseContextValue>(() => ({ open, openEdit }), [open, openEdit]);

	return (
		<AddExpenseContext.Provider value={value}>
			{children}
			<AddExpenseSheet
				open={sheetOpen}
				onClose={close}
				initialCategoryId={initialCategoryId}
				editTxn={editTxn}
			/>
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
