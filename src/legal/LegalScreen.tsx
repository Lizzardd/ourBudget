import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import type { LegalDoc } from './content';

/**
 * Renders a legal document (Privacy Policy / Terms) as a plain, readable page.
 * These routes live outside the `(app)` auth group so they're reachable without
 * signing in — the Google OAuth consent screen and the in-app consent gate both
 * link to them.
 */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
	const { t, accent } = useTheme();
	const insets = useSafeAreaInsets();

	const close = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/');
		}
	};

	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
					<Text style={[styles.close, { color: accent, fontFamily: fontFamily(800) }]}>Done</Text>
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
				showsVerticalScrollIndicator={false}
			>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(900) }]}>{doc.title}</Text>
				<Text style={[styles.effective, { color: t.sub }]}>Effective {doc.effective}</Text>
				<Text style={[styles.intro, { color: t.text }]}>{doc.intro}</Text>

				{doc.sections.map((section) => (
					<View key={section.heading} style={styles.section}>
						<Text style={[styles.heading, { color: t.text, fontFamily: fontFamily(800) }]}>
							{section.heading}
						</Text>
						{section.body.map((para, i) => (
							<Text key={i} style={[styles.para, { color: t.sub }]}>
								{para}
							</Text>
						))}
					</View>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 20,
		paddingBottom: 8,
		alignItems: 'flex-end',
	},
	close: {
		fontSize: 15,
	},
	content: {
		paddingHorizontal: 24,
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
	},
	title: {
		fontSize: 28,
		letterSpacing: -0.5,
	},
	effective: {
		fontSize: 13,
		marginTop: 4,
		marginBottom: 20,
	},
	intro: {
		fontSize: 15,
		lineHeight: 23,
		marginBottom: 8,
	},
	section: {
		marginTop: 24,
	},
	heading: {
		fontSize: 17,
		marginBottom: 8,
	},
	para: {
		fontSize: 15,
		lineHeight: 23,
		marginBottom: 10,
	},
});
