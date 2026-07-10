// Headless screenshot harness for the Home dashboard preview.
//
// Launches Chromium at phone width, navigates to the static-exported
// `/preview/home` route (no auth/Convex required — see
// `app/preview/home.tsx`), waits for the mock content to render, and saves
// a full-page PNG for visual comparison against the design prototype.
//
// Usage: node scripts/shoot-home.mjs [baseUrl] [outPath]

import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5555';
const outPath =
	process.argv[3] ??
	'/home/danielk/GIT/Noldor/mobile-budget/.superpowers/sdd/home-preview.png';
const url = baseUrl + '/preview/home';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
	viewport: { width: 412, height: 900 },
	deviceScaleFactor: 2,
});

console.log('Navigating to ' + url);
await page.goto(url, { waitUntil: 'networkidle' });
await page.getByText('Hi Sara', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

// react-native-web renders Home's ScrollView as a fixed-height `overflow:
// auto` div sized to the viewport, rather than letting `document.body`
// grow — so Playwright's `fullPage` screenshot (which measures document
// height) clips at the viewport. Find that scrollable div's true content
// height and resize the viewport to match before shooting, so the whole
// dashboard (through "+ New category") is captured.
const contentHeight = await page.evaluate(() => {
	let max = document.body.scrollHeight;
	document.querySelectorAll('*').forEach((el) => {
		if (el.scrollHeight > el.clientHeight) {
			max = Math.max(max, el.scrollHeight);
		}
	});
	return max;
});
await page.setViewportSize({ width: 412, height: contentHeight });
// Let the ScrollView's now-taller layout settle before shooting.
await page.waitForTimeout(200);

await page.screenshot({ path: outPath, fullPage: true });
console.log('Saved screenshot to ' + outPath + ' (content height ' + contentHeight + 'px)');

await browser.close();
