// Headless screenshot harness for the `/preview/*` mock-data routes.
//
// Launches Chromium at phone width, navigates to a static-exported preview
// route (no auth/Convex required — see `app/preview/*.tsx`), waits for the
// mock content to render, and saves a full-page PNG for visual comparison
// against the design prototype.
//
// Usage: node scripts/shoot.mjs <route> <outPath> [baseUrl] [waitForText]
//   route       - preview route name under app/preview/, e.g. "home" or "reports"
//   outPath     - PNG output path
//   baseUrl     - defaults to http://localhost:5555
//   waitForText - text to wait for before shooting; defaults to route-specific text

import { chromium } from 'playwright';

const route = process.argv[2];
if (!route) {
	console.error('Usage: node scripts/shoot.mjs <route> <outPath> [baseUrl] [waitForText]');
	process.exit(1);
}
const outPath = process.argv[3] ?? `/home/danielk/GIT/Noldor/mobile-budget/.superpowers/sdd/${route}-preview.png`;
const baseUrl = process.argv[4] ?? 'http://localhost:5555';
const DEFAULT_WAIT_TEXT = {
	home: 'Hi Sara',
	reports: 'Reports',
};
const waitForText = process.argv[5] ?? DEFAULT_WAIT_TEXT[route] ?? route;
const url = `${baseUrl}/preview/${route}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
	viewport: { width: 412, height: 900 },
	deviceScaleFactor: 2,
});

console.log('Navigating to ' + url);
await page.goto(url, { waitUntil: 'networkidle' });
await page.getByText(waitForText, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });

// react-native-web renders the ScrollView as a fixed-height `overflow: auto`
// div sized to the viewport, rather than letting `document.body` grow — so
// Playwright's `fullPage` screenshot (which measures document height) clips
// at the viewport. Find that scrollable div's true content height and
// resize the viewport to match before shooting, so the whole screen is
// captured.
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
