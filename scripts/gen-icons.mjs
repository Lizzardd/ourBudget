// One-off generator for the "Our Budget" brand app-icon assets.
// Renders "ob." on the rose brand mark using Playwright + real DM Sans Black font,
// then saves PNGs at exact target pixel sizes into assets/images/.
//
// Usage: node scripts/gen-icons.mjs

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets/images');
const FONT_PATH = path.join(
	ROOT,
	'node_modules/.pnpm/@expo-google-fonts+dm-sans@0.4.2/node_modules/@expo-google-fonts/dm-sans/900Black/DMSans_900Black.ttf'
);

const ROSE = '#C96287';
const OB_COLOR = '#FFF3F0';
const DOT_COLOR = '#2B0E1A';

function markHtml({ size, fontSize, background, tileSize, tileRadius }) {
	// background: 'full' = full-bleed rose square, 'tile' = rounded rose tile on
	// transparent canvas, 'transparent' = just the text on transparent canvas.
	const bodyBg = background === 'full' ? ROSE : 'transparent';
	const tile =
		background === 'tile'
			? `width:${tileSize}px;height:${tileSize}px;border-radius:${tileRadius}px;background:${ROSE};display:flex;align-items:center;justify-content:center;`
			: `width:100%;height:100%;display:flex;align-items:center;justify-content:center;`;

	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
	@font-face {
		font-family: 'DM Sans Black';
		src: url('file://${FONT_PATH}') format('truetype');
		font-weight: 900;
		font-style: normal;
	}
	* { margin: 0; padding: 0; box-sizing: border-box; }
	html, body {
		width: ${size}px;
		height: ${size}px;
		background: ${bodyBg};
	}
	.wrap {
		${tile}
	}
	.mark {
		font-family: 'DM Sans Black', sans-serif;
		font-weight: 900;
		font-style: normal;
		font-size: ${fontSize}px;
		letter-spacing: -0.06em;
		line-height: 1;
		white-space: nowrap;
	}
	.ob { color: ${OB_COLOR}; }
	.dot { color: ${DOT_COLOR}; }
</style>
</head>
<body>
	<div class="wrap">
		<div class="mark"><span class="ob">ob</span><span class="dot">.</span></div>
	</div>
</body>
</html>`;
}

async function shoot(page, html, outPath, size) {
	await page.setContent(html, { waitUntil: 'networkidle' });
	await page.evaluate(async () => {
		if (document.fonts && document.fonts.ready) {
			await document.fonts.ready;
		}
	});
	await page.waitForTimeout(150);
	await page.screenshot({
		path: outPath,
		omitBackground: true,
		clip: { x: 0, y: 0, width: size, height: size },
	});
	console.log(`Saved ${outPath} (${size}x${size})`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

// 1. icon.png — 1024x1024, full-bleed rose bg
{
	const size = 1024;
	await page.setViewportSize({ width: size, height: size });
	const html = markHtml({ size, fontSize: 460, background: 'full' });
	await shoot(page, html, path.join(IMAGES_DIR, 'icon.png'), size);
}

// 2. android-icon-foreground.png — 1024x1024, transparent, safe-zone sized
{
	const size = 1024;
	await page.setViewportSize({ width: size, height: size });
	const html = markHtml({ size, fontSize: 300, background: 'transparent' });
	await shoot(page, html, path.join(IMAGES_DIR, 'android-icon-foreground.png'), size);
}

// 3. favicon.png — 256x256, same as icon.png at 256
{
	const size = 256;
	await page.setViewportSize({ width: size, height: size });
	const html = markHtml({ size, fontSize: Math.round((460 / 1024) * 256), background: 'full' });
	await shoot(page, html, path.join(IMAGES_DIR, 'favicon.png'), size);
}

// 4. splash-icon.png — 512x512, transparent, rose rounded-square tile (~360px, radius ~96px)
{
	const size = 512;
	await page.setViewportSize({ width: size, height: size });
	const html = markHtml({
		size,
		fontSize: 160,
		background: 'tile',
		tileSize: 360,
		tileRadius: 96,
	});
	await shoot(page, html, path.join(IMAGES_DIR, 'splash-icon.png'), size);
}

// 5. android-icon-background.png — 1024x1024, solid rose
{
	const size = 1024;
	await page.setViewportSize({ width: size, height: size });
	const html = `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;background:${ROSE};}</style></head><body></body></html>`;
	await shoot(page, html, path.join(IMAGES_DIR, 'android-icon-background.png'), size);
}

await browser.close();
console.log('Done.');
