import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { NewCategorySheet } from './NewCategorySheet';

export interface NewCategoryContextValue {
	/** Opens the New-category sheet. */
	open: () => void;
}

const NewCategoryContext = createContext<NewCategoryContextValue | undefined>(undefined);

/**
 * Mounts the single, app-wide `NewCategorySheet` and exposes `open()` to
 * the rest of the tree via `useNewCategorySheet()`. Both the Home "+ New
 * category" row and the Settings "Add a category" row call `open()`.
 */
export function NewCategoryProvider({ children }: { children: ReactNode }) {
	const [sheetOpen, setSheetOpen] = useState(false);

	const open = useCallback(() => setSheetOpen(true), []);
	const close = useCallback(() => setSheetOpen(false), []);

	const value = useMemo<NewCategoryContextValue>(() => ({ open }), [open]);

	return (
		<NewCategoryContext.Provider value={value}>
			{children}
			<NewCategorySheet open={sheetOpen} onClose={close} />
		</NewCategoryContext.Provider>
	);
}

/** Reads the New-category open trigger from context. Must be used within a `NewCategoryProvider`. */
export function useNewCategorySheet(): NewCategoryContextValue {
	const ctx = useContext(NewCategoryContext);
	if (!ctx) {
		throw new Error('useNewCategorySheet must be used within a NewCategoryProvider');
	}
	return ctx;
}
