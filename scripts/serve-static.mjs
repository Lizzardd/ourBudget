import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 5555);

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
};

function resolvePath(urlPath) {
	let p = decodeURIComponent(urlPath.split('?')[0]);
	if (p === '/') p = '/index.html';
	let full = join(root, p);
	if (existsSync(full) && statSync(full).isDirectory()) {
		full = join(full, 'index.html');
	}
	if (!existsSync(full) && !extname(full)) {
		full = full + '.html';
	}
	return full;
}

const server = http.createServer((req, res) => {
	const full = resolvePath(req.url);
	if (!existsSync(full)) {
		res.writeHead(404);
		res.end('Not found: ' + full);
		return;
	}
	res.writeHead(200, { 'Content-Type': MIME[extname(full)] ?? 'application/octet-stream' });
	createReadStream(full).pipe(res);
});

server.listen(port, () => {
	console.log(`Serving ${root} on http://localhost:${port}`);
});
