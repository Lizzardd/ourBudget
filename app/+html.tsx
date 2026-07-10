import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

// Custom root HTML for Expo Router static web export.
// Replaces the framework default so we can add PWA installability
// metadata (manifest link, theme-color, apple touch icons) to every
// exported page. See docs/task-28 notes: offline caching / a service
// worker is intentionally NOT added here — this app is Convex
// online-first, so full offline support is deferred to a later phase.
// This file only makes the app themed + installable.
export default function Root({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<meta
					name="description"
					content="Our Budget — track and manage your household budget."
				/>
				<meta name="theme-color" content="#17120E" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-title" content="Our Budget" />
				<meta
					name="apple-mobile-web-app-status-bar-style"
					content="black-translucent"
				/>
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" href="/favicon-48.png" />
				<link rel="apple-touch-icon" href="/icon.png" />
				<ScrollViewStyleReset />
			</head>
			<body>{children}</body>
		</html>
	);
}
