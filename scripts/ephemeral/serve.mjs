import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.ephemeral-site');
const port = Number(process.argv[3] ?? 4280);
const configuration = JSON.parse(await readFile(resolve(root, 'staticwebapp.config.json'), 'utf8'));
const routes = configuration.routes === undefined ? [] : configuration.routes;
if (
  !Array.isArray(routes) ||
  routes.some(
    (rule) =>
      !rule ||
      typeof rule.route !== 'string' ||
      !/^\/[^*]*\*?$/.test(rule.route) ||
      rule.statusCode !== 404 ||
      Object.keys(rule).some((key) => key !== 'route' && key !== 'statusCode')
  )
) {
  throw new Error('Unsupported preview static route: only exact or trailing-wildcard paths with statusCode 404 are supported.');
}
const fallback = configuration.navigationFallback;
if (
  fallback?.rewrite !== '/index.html' ||
  !Array.isArray(fallback.exclude) ||
  fallback.exclude.some((pattern) => typeof pattern !== 'string' || !/^\/[^*{}]*(?:\*(?:\.[a-zA-Z0-9]+)?)?$/.test(pattern))
) {
  throw new Error(
    'Unsupported preview navigation fallback: expected /index.html and exact, trailing-wildcard, or single-extension exclusions with at most one wildcard.'
  );
}
const matchesPath = (pathname, pattern) =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  ).test(pathname);
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
    const route = routes.find((rule) => matchesPath(pathname, rule.route));
    if (route) {
      response.writeHead(route.statusCode, configuration.globalHeaders).end();
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
      const excluded = fallback.exclude.some((pattern) => matchesPath(pathname, pattern));
      if (excluded) {
        response.writeHead(404).end();
        return;
      }
      path = resolve(root, `.${fallback.rewrite}`);
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
