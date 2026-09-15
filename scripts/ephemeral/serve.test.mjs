import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const configuration = JSON.parse(readFileSync(new URL('./staticwebapp.config.json', import.meta.url), 'utf8'));
const extensionExclusions = configuration.navigationFallback.exclude.filter((pattern) => pattern.startsWith('/*.'));

const expectInvalidConfiguration = async (configuration, message) => {
  const directory = await mkdtemp(join(tmpdir(), 'laux-ephemeral-config-'));
  try {
    await writeFile(join(directory, 'staticwebapp.config.json'), JSON.stringify(configuration));
    await expect(
      promisify(execFile)(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url)), directory, '0'], {
        timeout: 5000,
      })
    ).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(message) });
  } finally {
    await rm(directory, { recursive: true });
  }
};

describe('production artifact smoke server', () => {
  let directory;
  let server;
  let baseUrl;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'laux-ephemeral-'));
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'index.html'), '<html>Local preview</html>');
    await writeFile(join(directory, 'assets', 'app.js'), 'window.preview = true;');
    // Existing files ensure auth blocking cannot pass solely via fallback exclusions.
    await mkdir(join(directory, '.auth', 'login'), { recursive: true });
    for (const path of [['login', 'aad'], ['login', 'github'], ['me'], ['providers']]) {
      await writeFile(join(directory, '.auth', ...path), 'Must not be served');
    }
    await copyFile(new URL('./staticwebapp.config.json', import.meta.url), join(directory, 'staticwebapp.config.json'));
    server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url)), directory, '0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    baseUrl = await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('exit', (code) => reject(new Error(`Static server exited before listening (${code}).`)));
      let output = '';
      server.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          resolve(match[0]);
        }
      });
    });
  });

  afterAll(async () => {
    if (server && server.exitCode === null) {
      const stopped = once(server, 'exit');
      server.kill();
      await stopped;
    }
    if (directory) {
      await rm(directory, { recursive: true });
    }
  });

  it.each(['/', '/v2', '/v2/', '/xauth/me', '/missingXjson'])('serves the entry document at %s with trusted headers', async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(await response.text()).toContain('Local preview');
  });

  it('serves built JavaScript rather than an HTML fallback', async () => {
    const response = await fetch(`${baseUrl}/assets/app.js`);
    expect(response.headers.get('content-type')).toBe('text/javascript');
    expect(await response.text()).toContain('window.preview');
  });

  it.each([
    ['GET', '/.auth/login/aad'],
    ['GET', '/.auth/login/github'],
    ['GET', '/.auth/login/aad?post_login_redirect_uri=%2Fv2'],
    ['GET', '/.auth/me'],
    ['GET', '/.auth/providers'],
    ['POST', '/.auth/login/aad'],
    ['POST', '/.auth/me'],
    ['HEAD', '/.auth/me'],
  ])('blocks %s %s before static-file serving', async (method, path) => {
    const response = await fetch(`${baseUrl}${path}`, { method, redirect: 'manual' });
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
  });

  it.each([
    ...extensionExclusions.flatMap((pattern) => [pattern.replaceAll('*', 'missing'), pattern.replaceAll('*', 'nested/missing')]),
    '/assets/missing.js',
    '/assets/missing',
    '/armToken.json',
    '/foundryToken.json',
    '/subscriptionIds.json',
    '/__dev/armToken',
    '/api/test',
    '/templatesLocalProxy/templates',
  ])('keeps %s missing instead of rewriting it to HTML', async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });
});

describe('unsupported static routing configuration', () => {
  it.each(
    [
      null,
      {},
      [null],
      [{ route: '/.auth/*', statusCode: 302 }],
      [{ route: '/.auth/*', statusCode: 404, methods: ['GET'] }],
      [{ route: '/.auth/*', statusCode: 404, rewrite: '/index.html' }],
      [{ route: '/.auth/*/callback', statusCode: 404 }],
    ].map((routes) => ({ routes }))
  )('fails at startup rather than silently ignoring $routes', async ({ routes }) => {
    await expectInvalidConfiguration({ ...configuration, routes }, 'Unsupported preview static route');
  });
});

describe('unsupported navigation fallback configuration', () => {
  it.each(
    [
      undefined,
      null,
      {},
      { rewrite: '/other.html', exclude: [] },
      ...[null, {}, '/*.js', [null], [42], ['missing.js'], ['/*.*'], ['/assets/*/*.js'], ['/*.{js,css}']].map((exclude) => ({
        rewrite: '/index.html',
        exclude,
      })),
    ].map((navigationFallback) => ({ navigationFallback }))
  )('fails at startup rather than accepting $navigationFallback', async ({ navigationFallback }) => {
    await expectInvalidConfiguration({ ...configuration, navigationFallback }, 'Unsupported preview navigation fallback');
  });
});
