import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateBanner } from '../src/features/UpdateBanner';
import { useOtaUpdates } from '../src/hooks/useOtaUpdates';
import { ToastProvider } from '../src/lib/toast';
import { dmSansFonts, materialSymbolsFonts } from '../src/theme/fonts';
import { ThemeProvider } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
	throw new Error(
		'Missing EXPO_PUBLIC_CONVEX_URL. Set it in .env.local before starting the app.'
	);
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

// ConvexAuthProvider requires an explicit storage on React Native (no
// localStorage there); web keeps the default localStorage-backed storage.
const secureStorage = {
	getItem: SecureStore.getItemAsync,
	setItem: SecureStore.setItemAsync,
	removeItem: SecureStore.deleteItemAsync,
};

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
