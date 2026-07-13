import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateBanner } from '../src/features/UpdateBanner';
import { useOtaUpdates } from '../src/hooks/useOtaUpdates';
import { ToastProvider } from '../src/lib/toast';
import { dmSansFonts, materialSymbolsFonts } from '../src/theme/fonts';
import { ThemeProvider } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

/**
 * Never throw at module scope over a missing env var.
 *
 * `EXPO_PUBLIC_*` values are inlined at bundle time, and an OTA bundle is
 * built on the developer's machine — not by EAS Build, which is what injects
 * `eas.json`'s profile env. Get that wrong and this module throws on import,
 * before React can render: the update crashes at startup, expo-updates rolls
 * back to the embedded bundle, and the staged update retries forever. A
 * crash-loop is a terrible way to report a config mistake, so we surface it on
 * screen instead and let the app boot.
 */
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

// ConvexAuthProvider requires an explicit storage on React Native (no
// localStorage there); web keeps the default localStorage-backed storage.
const secureStorage = {
	getItem: SecureStore.getItemAsync,
	setItem: SecureStore.setItemAsync,
	removeItem: SecureStore.deleteItemAsync,
};

const configErrorStyles = StyleSheet.create({
	wrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		backgroundColor: '#17120E',
	},
	text: {
		color: '#F6EDE3',
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
	},
});

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts({ ...dmSansFonts, ...materialSymbolsFonts });

	useOtaUpdates();

	useEffect(() => {
		if (fontsLoaded || fontError) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError]);

	if (!fontsLoaded && !fontError) {
		return null;
	}

	if (!convex) {
		return (
			<View style={configErrorStyles.wrap}>
				<Text style={configErrorStyles.text}>
					This build is missing EXPO_PUBLIC_CONVEX_URL, so it can&apos;t reach the backend.
					Reinstall the app from the latest build.
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaProvider>
			<ConvexAuthProvider
				client={convex}
				storage={Platform.OS === 'web' ? undefined : secureStorage}
			>
				<ThemeProvider>
					<ToastProvider>
						<Stack screenOptions={{ headerShown: false }} />
						<UpdateBanner />
					</ToastProvider>
				</ThemeProvider>
			</ConvexAuthProvider>
		</SafeAreaProvider>
	);
}
