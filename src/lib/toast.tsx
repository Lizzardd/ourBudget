import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';

import { Toast } from '../components/Toast';

const AUTO_DISMISS_MS = 2400;

interface ToastContextValue {
	toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Mounts the toast pill once near the app root and exposes `toast(msg)` to
 * the rest of the tree via `useToast()`. Only one toast is shown at a
 * time — calling `toast()` again replaces the current message and resets
 * the 2400ms auto-dismiss timer, matching the prototype's single-slot
 * `this.state.toast`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
	const [message, setMessage] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const toast = useCallback((next: string) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		setMessage(next);
		timerRef.current = setTimeout(() => {
			setMessage(null);
			timerRef.current = null;
		}, AUTO_DISMISS_MS);
	}, []);

	const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<Toast message={message} />
		</ToastContext.Provider>
	);
}

/** Reads the toast trigger from context. Must be used within a `ToastProvider`. */
export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return ctx;
}
