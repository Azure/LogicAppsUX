import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.ephemeral-site');
const port = Number(process.argv[3] ?? 4280);
const configuration = JSON.parse(await readFile(resolve(root, 'staticwebapp.config.json'), 'utf8'));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
};

// A static production-artifact harness, deliberately without Vite plugins or API proxies.
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = resolve(root, `.${pathname}`);
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      response.writeHead(400).end();
      return;
    }
    let exists;
    try {
      exists = await stat(path);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
        throw error;
      }
    }
    if (exists?.isDirectory()) {
      path = resolve(path, 'index.html');
    } else if (!exists) {
      const excluded = configuration.navigationFallback.exclude.some((pattern) =>
        new RegExp(
          `^${pattern
            .split('*')
            .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*')}$`
        ).test(pathname)
      );
      if (excluded) {
        response.writeHead(404).end();
        return;
      }
      path = resolve(root, `.${configuration.navigationFallback.rewrite}`);
    }
    const content = await readFile(path);
    response.writeHead(200, {
      ...configuration.globalHeaders,
      'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
    });
    response.end(content);
  } catch (error) {
    console.error('Preview static server request failed:', error.message);
    if (!response.headersSent) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    }
    response.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Static preview listening on http://127.0.0.1:${server.address().port}`));
