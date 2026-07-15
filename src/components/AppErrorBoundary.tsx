import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

/**
 * Stops one failing query from blanking the entire app.
 *
 * A thrown Convex query — a rejected auth token, a backend that lost a function
 * to deploy skew, a network blip — propagates up through the React tree, and
 * with nothing to catch it React unmounts everything to a white screen with no
 * text. That is the worst possible failure: the user cannot tell a crash from a
 * hang, and there is no way back except reinstalling or clearing storage. This
 * is the same lesson the OTA crash-loop taught — an app that renders nothing is
 * worse than one that renders something wrong.
 *
 * So we catch it and render a screen that SAYS what happened and offers the two
 * things that actually recover: retry (for a transient error) and sign out (for
 * a bad session, which is the common web case — a token the client trusts but
 * the server rejects). It sits inside ThemeProvider and ConvexAuthProvider so
 * the fallback can use the theme and the sign-out action.
 */
export class AppErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	private reset = () => this.setState({ error: null });

	render() {
		if (this.state.error) {
			return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
		}
		return this.props.children;
	}
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
	const { t, accent } = useTheme();
	const { signOut } = useAuth();

	const handleSignOut = async () => {
		// Clear the session first, THEN drop the error state. Resetting the
		// boundary re-renders the tree, which now sees an unauthenticated user and
		// routes to the welcome screen instead of re-throwing the same query.
		try {
			await signOut();
		} finally {
			onRetry();
		}
	};

	return (
		<View style={[styles.wrap, { backgroundColor: t.bg }]}>
			<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
				Something went wrong
			</Text>
			<Text style={[styles.body, { color: t.sub }]}>
				The app hit an error it couldn&apos;t recover from on its own. Try again, or sign out and
				back in.
			</Text>
			<Pressable
				onPress={onRetry}
				accessibilityRole="button"
				style={({ pressed }) => [styles.primary, { backgroundColor: accent, opacity: pressed ? 0.7 : 1 }]}
			>
				<Text style={[styles.primaryLabel, { fontFamily: fontFamily(800) }]}>Try again</Text>
			</Pressable>
			<Pressable onPress={handleSignOut} accessibilityRole="button" style={styles.secondary}>
				<Text style={[styles.secondaryLabel, { color: accent, fontFamily: fontFamily(800) }]}>
					Sign out
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		gap: 8,
	},
	title: {
		fontSize: 20,
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 12,
	},
	primary: {
		paddingVertical: 12,
		paddingHorizontal: 28,
		borderRadius: 14,
	},
	primaryLabel: {
		fontSize: 15,
		color: '#17120E',
	},
	secondary: {
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	secondaryLabel: {
		fontSize: 14,
	},
});
