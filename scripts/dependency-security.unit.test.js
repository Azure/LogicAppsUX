import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { ESLint } from 'eslint';
import { createAzuriteBlobClient } from '../apps/vs-code-designer/src/app/debug/azuriteClient.ts';
import { coverageDefaults } from '../libs/shared-test-utils/vitestCoverage.ts';

const requireExtension = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'vs-code-designer', 'package.json'));
const requireMocha = createRequire(requireExtension.resolve('mocha'));
const requireVitest = createRequire(requireExtension.resolve('vitest/package.json'));
const requireVsce = createRequire(requireExtension.resolve('@vscode/vsce'));
const requireDesignerUi = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'libs', 'designer-ui', 'package.json'));
const picomatch = requireVitest('picomatch');
const { glob } = requireVitest('tinyglobby');

function isIncludedInCoverage(file) {
  return picomatch.isMatch(file, coverageDefaults.include, {
    contains: true,
    dot: true,
    ignore: coverageDefaults.exclude,
  });
}

function fixtureDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'logicapps-dependency-security-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function sanitizerFixture(t) {
  const { JSDOM } = requireVitest('jsdom');
  const { window } = new JSDOM('<!doctype html><body></body>');
  t.after(() => window.close());
  return { window, purify: requireDesignerUi('dompurify')(window) };
}

test('DOMPurify preserves ordinary links and tables while removing executable markup', (t) => {
  const { window, purify } = sanitizerFixture(t);
  const result = window.document.createElement('div');
  result.innerHTML = purify.sanitize(
    '<a href="https://example.invalid/docs">reference</a><table><tr><td>value</td></tr></table><img onerror="void 0"><script>void 0</script>'
  );
  assert.equal(result.querySelector('a')?.href, 'https://example.invalid/docs');
  assert.equal(result.querySelector('td')?.textContent, 'value');
  assert.equal(result.querySelector('script, [onerror]'), null);
});

for (const hook of ['afterSanitizeElements', 'afterSanitizeAttributes']) {
  test(`DOMPurify neutralizes an IN_PLACE subtree detached by ${hook}`, (t) => {
    const { window, purify } = sanitizerFixture(t);
    const root = window.document.createElement('div');
    root.innerHTML = '<section id="wrapper"><img onerror="void 0"></section>';
    window.document.body.append(root);
    const wrapper = root.querySelector('section');
    const image = root.querySelector('img');
    purify.addHook(hook, (node) => {
      if (node === wrapper) {
        node.remove();
      }
    });
    purify.sanitize(root, { IN_PLACE: true });
    assert.equal(root.contains(wrapper), false);
    assert.equal(image.hasAttribute('onerror'), false);
  });
}

test('VSIX packaging retains temporary file and directory creation and cleanup', (t) => {
  const directory = fixtureDirectory(t);
  const temporary = requireVsce('tmp');
  const file = temporary.fileSync({ tmpdir: directory, prefix: 'logicapps', postfix: '.txt' });
  try {
    assert.equal(dirname(file.name), directory);
    writeFileSync(file.fd, 'temporary contents');
    assert.equal(readFileSync(file.name, 'utf8'), 'temporary contents');
  } finally {
    file.removeCallback();
  }
  assert.equal(existsSync(file.name), false);
  const folder = temporary.dirSync({ tmpdir: directory, prefix: 'logicapps' });
  try {
    assert.equal(dirname(folder.name), directory);
    assert.ok(existsSync(folder.name));
  } finally {
    folder.removeCallback();
  }
  assert.equal(existsSync(folder.name), false);
});

test('temporary names reject non-string path options before generating an escaped name', (t) => {
  const directory = fixtureDirectory(t);
  const temporaryRoot = join(directory, 'temporary');
  mkdirSync(temporaryRoot);
  const temporary = requireVsce('tmp');
  for (const option of ['prefix', 'postfix', 'template']) {
    for (const value of [
      ['../escape-XXXXXX'],
      Buffer.from('../escape-XXXXXX'),
      { includes: () => false, toString: () => '../escape-XXXXXX' },
    ]) {
      assert.throws(() => temporary.tmpNameSync({ tmpdir: temporaryRoot, [option]: value }), /must be a string/);
    }
  }
});

test('Vitest coverage retains every previously supported executable extension', () => {
  for (const extension of ['js', 'cjs', 'mjs', 'ts', 'mts', 'tsx', 'jsx', 'vue', 'svelte', 'marko', 'astro']) {
    for (const file of [`src/nested/untested.${extension}`, `src/nested/multiple.parts.${extension}`]) {
      assert.ok(isIncludedInCoverage(file), file);
    }
    for (const file of ['src/components/test/TestPanel.tsx', 'src/__test__/intl-test-helper.tsx']) {
      assert.ok(isIncludedInCoverage(file), file);
    }
  }
});

test('Vitest coverage does not instrument documentation, assets, declarations, or test files', () => {
  for (const file of [
    'src/graphify-out/GRAPH_REPORT.md',
    'src/graphify-out/graph.json',
    'src/images/icon.svg',
    'src/styles.css',
    'src/types.d.ts',
    'src/__tests__/helper.ts',
    'src/nested/example.spec.ts',
    'src/nested/example.test.tsx',
    'src/\x00virtual.ts',
    'src/virtual:module.ts',
    'src/__x00__module.ts',
    'src/nested/source.ts.txt',
    'src/nested/source.js.map',
    'src/folder.js/nested/graph.json',
  ]) {
    assert.ok(!isIncludedInCoverage(file), file);
  }
});

test('Vitest coverage discovery and instrumentation agree on real source filenames', async (t) => {
  const directory = fixtureDirectory(t);
  const expected = ['src/example.js', 'src/nested/multiple.parts.ts', 'src/component.tsx'];
  for (const file of [...expected, 'src/graph.json', 'src/example.js.map', 'src/nested/report.md', 'src/example.spec.ts']) {
    const absolute = join(directory, file);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, 'export const example = 1;\n');
  }
  const discovered = await glob(coverageDefaults.include, { cwd: directory, ignore: coverageDefaults.exclude, dot: true });
  assert.deepEqual(discovered.sort(), expected.sort());
  assert.ok(discovered.every((file) => isIncludedInCoverage(join(directory, file).replaceAll('\\', '/'))));
});

test('Vitest coverage keeps prefix-sharing sibling packages outside the project root', async () => {
  const { BaseCoverageProvider } = await import('vitest/node');
  for (const root of ['/repo/designer', 'D:/repo/designer']) {
    const provider = new BaseCoverageProvider();
    provider.roots = [root];
    provider.options = { ...coverageDefaults, allowExternal: false };
    assert.ok(provider.isIncluded(`${root}/src/component.ts`));
    assert.equal(provider.isIncluded(`${root}-ui/src/component.ts`), false);
    provider.options.allowExternal = true;
    provider.globCache.clear();
    assert.ok(provider.isIncluded(`${root}-ui/src/component.ts`));
  }
  for (const root of ['/', 'D:/', '/repo/designer/']) {
    const provider = new BaseCoverageProvider();
    provider.roots = [root];
    provider.options = { ...coverageDefaults, allowExternal: false };
    assert.ok(provider.isIncluded(`${root}src/component.ts`));
  }
});

test('coverage discovery ignores external setup files without losing untested sources', async (t) => {
  const directory = fixtureDirectory(t);
  const cwd = join(directory, 'project');
  for (const file of ['project/src/untested.ts', 'shared/setup.ts', 'shared/included.ts']) {
    const absolute = join(directory, file);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, 'export const example = 1;\n');
  }
  for (const setup of ['../shared/setup.ts', join(directory, 'shared', 'setup.ts').replaceAll('\\', '/')]) {
    const options = { cwd, ignore: [...coverageDefaults.exclude, setup], dot: true };
    assert.deepEqual(await glob(coverageDefaults.include, options), ['src/untested.ts']);
    assert.deepEqual((await glob([...coverageDefaults.include, '../shared/*.ts'], { cwd, ignore: [setup], dot: true })).sort(), [
      '../shared/included.ts',
      'src/untested.ts',
    ]);
  }
});

test('Mocha worker options retain serializable values and HTML escaping', () => {
  const serialize = requireMocha('serialize-javascript');
  const text = '</script><script>example</script>';
  const serialized = serialize({
    text,
    date: new Date('2026-01-01T00:00:00.000Z'),
    pattern: /example/i,
    transform: (value) => value * 2,
  });
  assert.ok(!serialized.includes('</script>'));
  const restored = runInNewContext(`(${serialized})`);
  assert.equal(restored.text, text);
  assert.equal(restored.date.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.ok(restored.pattern.test('EXAMPLE'));
  assert.equal(restored.transform(3), 6);
});

test('the actual Mocha CLI preserves parallel worker tests, hooks, and reporting', (t) => {
  const directory = fixtureDirectory(t);
  const files = ['first.cjs', 'second.cjs'].map((name) => {
    const file = join(directory, name);
    writeFileSync(
      file,
      `const assert = require('node:assert/strict');
describe('${name}', () => {
  let value;
  beforeEach(() => { value = 1; });
  it('serializable worker options', () => { assert.equal(value++, 1); });
  it('asynchronous behavior', async () => { assert.equal(await Promise.resolve(value), 1); });
});`
    );
    return file;
  });
  const result = spawnSync(
    process.execPath,
    [
      requireExtension.resolve('mocha/bin/mocha.js'),
      '--no-config',
      '--no-package',
      '--reporter',
      'json',
      '--parallel',
      '--jobs',
      '2',
      ...files,
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.stats.tests, 4);
  assert.equal(report.stats.passes, 4);
  assert.equal(report.stats.failures, 0);
});

test('Mocha still renders assertion diffs using its resolved diff dependency', (t) => {
  const directory = fixtureDirectory(t);
  const file = join(directory, 'expected-failure.cjs');
  writeFileSync(
    file,
    `const assert = require('node:assert/strict');
it('expected diagnostic', () => { assert.deepEqual({ count: 1 }, { count: 2 }); });`
  );
  const result = spawnSync(
    process.execPath,
    [requireExtension.resolve('mocha/bin/mocha.js'), '--no-config', '--no-package', '--no-color', file],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /1 failing/);
  assert.match(result.stdout, /-\s+"count": 1/);
  assert.match(result.stdout, /\+\s+"count": 2/);
});

test('ESLint preserves cached diagnostics and invalidates content and configuration changes', async (t) => {
  const directory = fixtureDirectory(t);
  const file = join(directory, 'example.js');
  writeFileSync(file, 'const example = 1;\n');
  let executions = 0;
  const plugin = {
    rules: {
      diagnostic: {
        meta: { schema: [{ type: 'string' }] },
        create(context) {
          executions++;
          return { Program: (node) => context.report({ node, message: context.options[0] }) };
        },
      },
    },
  };
  const lint = (message) =>
    new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      cache: true,
      cacheStrategy: 'content',
      cacheLocation: join(directory, '.eslintcache'),
      overrideConfig: [{ plugins: { fixture: plugin }, rules: { 'fixture/diagnostic': ['warn', message] } }],
    }).lintFiles([file]);

  assert.equal((await lint('original'))[0].messages[0].message, 'original');
  assert.equal(executions, 1);
  assert.equal((await lint('original'))[0].messages[0].message, 'original');
  assert.equal(executions, 1);
  writeFileSync(file, 'const example = 2;\n');
  await lint('original');
  assert.equal(executions, 2);
  assert.equal((await lint('updated'))[0].messages[0].message, 'updated');
  assert.equal(executions, 3);
});

for (const status of [200, 404, 500, 'abort']) {
  test(`the Azure storage SDK preserves readiness probe behavior for ${status}`, async (t) => {
    const controller = new globalThis.AbortController();
    const requests = [];
    const server = createServer((request, response) => {
      requests.push({ method: request.method, url: request.url, version: request.headers['x-ms-version'] });
      if (request.headers['x-ms-version'] !== '2018-03-28') {
        response.writeHead(400, { 'x-ms-error-code': 'InvalidHeaderValue' });
        response.end();
        return;
      }
      if (status === 'abort') {
        controller.abort();
        return;
      }
      response.writeHead(status, {
        'x-ms-request-id': 'local-security-regression-test',
        ...(status === 404 ? { 'x-ms-error-code': 'ContainerNotFound' } : {}),
      });
      response.end();
    });
    t.after(
      () =>
        new Promise((resolve, reject) => {
          controller.abort();
          server.closeAllConnections();
          server.close((error) => (error ? reject(error) : resolve()));
        })
    );
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    const key = Buffer.from('local-test-only-not-an-azure-credential').toString('base64');
    const connectionString = `DefaultEndpointsProtocol=http;AccountName=fixtureaccount;AccountKey=${key};BlobEndpoint=http://127.0.0.1:${port}/fixtureaccount;`;
    const client = createAzuriteBlobClient(connectionString);
    const probe = client.getContainerClient('azure-webjob-hosts').exists({ abortSignal: controller.signal });
    if (status === 'abort') {
      await assert.rejects(probe, { name: 'AbortError' });
    } else if (status === 500) {
      await assert.rejects(probe, { statusCode: 500 });
    } else {
      assert.equal(await probe, status === 200);
    }
    assert.deepEqual(requests, [{ method: 'GET', url: '/fixtureaccount/azure-webjob-hosts?restype=container', version: '2018-03-28' }]);
  });
}
