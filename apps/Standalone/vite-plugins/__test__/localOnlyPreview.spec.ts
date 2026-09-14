import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, normalizePath, type Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment, loadSubscriptionIds, loadToken } from '../../src/environments/environment.ephemeral';
import { localOnlyPreview } from '../localOnlyPreview';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const fixtures: string[] = [];

const createFixture = async () => {
  const root = await mkdtemp(resolve(testDirectory, '.local-only-preview-'));
  fixtures.push(root);
  await mkdir(resolve(root, 'src/environments/jsonImport'), { recursive: true });
  await mkdir(resolve(root, 'src/nested'), { recursive: true });
  await mkdir(resolve(root, 'public'), { recursive: true });
  await writeFile(resolve(root, 'public/vite.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(resolve(root, 'public/subscriptionIds.json'), '{"subscriptionIds":["PRIVATE_SUBSCRIPTION_SENTINEL"]}');
  await writeFile(resolve(root, 'public/authredirect.html'), 'PRIVATE_AUTH_REDIRECT_SENTINEL');
  await writeFile(
    resolve(root, 'src/environments/jsonImport/armToken.json'),
    '{"accessToken":"PRIVATE_ARM_SENTINEL","expiresOn":"2999-01-01"}'
  );
  await writeFile(
    resolve(root, 'src/environments/jsonImport/foundryToken.json'),
    '{"accessToken":"PRIVATE_FOUNDRY_SENTINEL","expiresOn":"2999-01-01"}'
  );
  await copyFile(resolve(testDirectory, '../../src/environments/environment.ts'), resolve(root, 'src/environments/environment.ts'));
  await copyFile(
    resolve(testDirectory, '../../src/environments/environment.ephemeral.ts'),
    resolve(root, 'src/environments/environment.ephemeral.ts')
  );
  await writeFile(
    resolve(root, 'src/nested/consumer.ts'),
    "export { environment, loadToken, loadSubscriptionIds } from '../environments/environment';"
  );
  await writeFile(resolve(root, 'src/App.tsx'), "globalThis.routes = 'NON_PREVIEW_ROUTES_SENTINEL';");
  await writeFile(resolve(root, 'src/App.ephemeral.tsx'), "globalThis.routes = 'LOCAL_PREVIEW_ROUTES_SENTINEL';");
  await writeFile(
    resolve(root, 'src/main.ts'),
    "import './App'; import { environment, loadToken, loadSubscriptionIds } from './nested/consumer'; globalThis.preview = { environment, loadToken, loadSubscriptionIds };"
  );
  await writeFile(resolve(root, 'index.html'), '<div id="root"></div><script type="module" src="/src/main.ts"></script>');
  return root;
};

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await Promise.all(fixtures.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('local-only preview', () => {
  it('provides production environment contracts without fetching credentials or subscriptions', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    expect(environment).toEqual({ production: true });
    expect(Object.isFrozen(environment)).toBe(true);
    await expect(loadToken()).resolves.toBeNull();
    await expect(loadSubscriptionIds()).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('excludes private configuration from a dirty production build and keeps root-hosted assets', async () => {
    const root = await createFixture();
    await mkdir(resolve(root, 'dist'), { recursive: true });
    await writeFile(resolve(root, 'dist/subscriptionIds.json'), 'PRIVATE_SUBSCRIPTION_SENTINEL');
    const modules: string[] = [];
    const captureModules: Plugin = {
      name: 'capture-preview-modules',
      moduleParsed(info) {
        modules.push(normalizePath(info.id));
      },
    };

    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      mode: 'ephemeral',
      plugins: [localOnlyPreview(), captureModules],
      build: { minify: false },
    });

    const outputDirectory = resolve(root, 'dist');
    const outputFiles = await readdir(outputDirectory, { recursive: true });
    const assets = outputFiles.filter((file) => file.endsWith('.js') || file.endsWith('.html'));
    const output = (await Promise.all(assets.map((file) => readFile(resolve(outputDirectory, file), 'utf8')))).join('\n');

    expect(modules).toContain(normalizePath(resolve(root, 'src/environments/environment.ephemeral.ts')));
    expect(modules).toContain(normalizePath(resolve(root, 'src/App.ephemeral.tsx')));
    expect(modules).not.toContain(normalizePath(resolve(root, 'src/App.tsx')));
    expect(modules).not.toContain(normalizePath(resolve(root, 'src/environments/environment.ts')));
    expect(modules.some((id) => id.includes('/jsonImport/'))).toBe(false);
    expect(output).not.toMatch(/PRIVATE_(?:ARM|FOUNDRY|SUBSCRIPTION|AUTH_REDIRECT)_SENTINEL/);
    expect(output).not.toContain('/__dev/armToken');
    expect(output).not.toContain('armToken.json');
    expect(output).not.toContain('foundryToken.json');
    expect(output).not.toContain('jsonImport/');
    expect(output).not.toContain('subscriptionIds.json');
    expect(output).not.toContain('NON_PREVIEW_ROUTES_SENTINEL');
    expect(output).toContain('LOCAL_PREVIEW_ROUTES_SENTINEL');
    expect(outputFiles).not.toContain('subscriptionIds.json');
    expect(outputFiles).not.toContain('authredirect.html');
    expect(outputFiles.some((file) => file.endsWith('.map'))).toBe(false);
    expect(outputFiles).toContain('vite.svg');
    expect(await readFile(resolve(outputDirectory, 'index.html'), 'utf8')).toContain('src="/assets/');
  });

  it.each(['armToken', 'foundryToken'])('fails closed if %s is imported outside the environment adapter', async (tokenName) => {
    const root = await createFixture();
    await writeFile(
      resolve(root, 'src/main.ts'),
      `import token from './environments/jsonImport/${tokenName}.json'; globalThis.preview = token;`
    );

    await expect(build({ root, configFile: false, logLevel: 'silent', plugins: [localOnlyPreview()] })).rejects.toThrow(
      'Developer authentication or subscription configuration cannot be included'
    );
  });

  it('rejects non-production builds rather than exposing development behavior', async () => {
    const root = await createFixture();
    vi.stubEnv('NODE_ENV', 'development');

    await expect(build({ root, configFile: false, logLevel: 'silent', plugins: [localOnlyPreview()] })).rejects.toThrow(
      'Local-only previews require a production build.'
    );
  });

  it.each(['designer', 'designerV2'])('retains the existing %s canvas stylesheet in production', async (shell) => {
    const root = await createFixture();
    const entry = normalizePath(resolve(testDirectory, `../../src/designer/app/DesignerShell/${shell}.ephemeral.ts`));
    const stubShell: Plugin = {
      name: 'stub-designer-component',
      enforce: 'pre',
      resolveId(source, importer) {
        return importer && normalizePath(importer) === entry && source === `./${shell}` ? '\0designer-component' : null;
      },
      load(id) {
        return id === '\0designer-component' ? 'export const DesignerWrapper = () => null;' : null;
      },
    };
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [localOnlyPreview(), stubShell],
      build: { write: false, minify: false, cssMinify: false, rollupOptions: { input: entry } },
    });
    const results = Array.isArray(result) ? result : [result];
    const css = results
      .flatMap((output) => ('output' in output ? output.output : []))
      .filter((output) => output.type === 'asset' && output.fileName.endsWith('.css'))
      .map((output) => (output.type === 'asset' ? String(output.source) : ''))
      .join('\n');

    expect(css).toMatch(/\.react-flow__background\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.msla-designer-tools\s*\{[^}]*position:\s*absolute/);
  });

  it('does not replace the environment or suppress public files in the normal build', async () => {
    const root = await createFixture();
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: { minify: false },
    });
    const results = Array.isArray(result) ? result : [result];
    const code = results
      .flatMap((output) => ('output' in output ? output.output : []))
      .filter((output) => output.type === 'chunk')
      .map((output) => output.code)
      .join('\n');

    expect(code).toContain('PRIVATE_ARM_SENTINEL');
    expect(code).toContain('PRIVATE_FOUNDRY_SENTINEL');
    expect(code).toContain('NON_PREVIEW_ROUTES_SENTINEL');
    expect(await readFile(resolve(root, 'dist/subscriptionIds.json'), 'utf8')).toContain('PRIVATE_SUBSCRIPTION_SENTINEL');
  });
});
