import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { ExperimentalBundleSource, readExperimentalBundleSelection } from '../experimentalBundleRuntime';

vi.unmock('node:os');

const id = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
let root: string;
let source: ExperimentalBundleSource;

async function bundle(folder = '1.197.13', version = '1.197.0.13', manifestId = id): Promise<string> {
  const directory = path.join(root, folder);
  await mkdir(path.join(directory, 'bin'), { recursive: true });
  await writeFile(path.join(directory, 'bundle.json'), JSON.stringify({ id: manifestId, version }));
  await writeFile(path.join(directory, 'bin', 'extensions.json'), '{}');
  await writeFile(path.join(directory, 'bin', 'Microsoft.Azure.Workflows.Data.Edge.dll'), 'synthetic-runtime-file');
  return directory;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(process.cwd(), '.logicapps-bundle-test-'));
  source = new ExperimentalBundleSource();
});

afterEach(async () => {
  source.dispose();
  await rm(root, { recursive: true, force: true });
});

describe('experimental runtime bundle resolution', () => {
  it.each([
    ['1.197.13', '1.197.0.13'],
    ['1.197.0.13', '1.197.0.13'],
    ['1.197.0', '1.197.0'],
  ])('binds folder %s independently of manifest %s', async (folder, version) => {
    const directory = await bundle(folder, version);
    const before = await readFile(path.join(directory, 'bundle.json'), 'utf8');
    const runtime = await source.resolve(directory);
    const uri = runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    expect(uri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+$/);
    expect(runtime.folderVersion).toBe(folder);
    expect(runtime.manifestVersion).toBe(version);
    expect(runtime.env.AzureFunctionsJobHost__extensionBundle__version).toBe(`[${folder}]`);
    expect(runtime.env.AzureFunctionsJobHost__extensionBundle__downloadPath).toBe(root);

    // This is the index lookup the installed runtime makes even with ensureLatest=true.
    const response = await fetch(`${uri}/ExtensionBundles/${id}/index.json`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([folder]);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await readFile(path.join(directory, 'bundle.json'), 'utf8')).toBe(before);
  });

  it('reuses one listening source without mixing concurrent version selections', async () => {
    const [first, second] = await Promise.all([source.resolve(await bundle()), source.resolve(await bundle('1.170.91', '1.170.91'))]);
    expect(new URL(first.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).port).toBe(
      new URL(second.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).port
    );
    expect(first.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).not.toBe(second.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI);
    const repeated = await source.resolve(first.directory);
    expect(repeated.env).toEqual(first.env);
  });

  it.each(['../bundle.json', 'ExtensionBundles/other/index.json', `ExtensionBundles/${id}/1.197.13/package.zip`])(
    'does not serve files, archives or other bundles: %s',
    async (suffix) => {
      const runtime = await source.resolve(await bundle());
      const response = await fetch(`${runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/${suffix}`);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('');
    }
  );

  it('rejects non-GET metadata operations', async () => {
    const runtime = await source.resolve(await bundle());
    const response = await fetch(`${runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`, {
      method: 'POST',
    });
    expect(response.status).toBe(404);
  });

  it.each([
    ['1.197.13', 'not-a-version', id],
    ['1.197.13', '1.197.0.13', 'foreign-bundle'],
    ['not-a-version', '1.197.0.13', id],
  ])('rejects invalid selected identity %s/%s/%s before launch', async (folder, version, manifestId) => {
    await expect(source.resolve(await bundle(folder, version, manifestId))).rejects.toThrow(/invalid|valid three-/);
  });

  it('fails closed if a selected bundle is removed after registration', async () => {
    const runtime = await source.resolve(await bundle());
    await rm(path.join(runtime.directory, 'bin', 'Microsoft.Azure.Workflows.Data.Edge.dll'));
    const response = await fetch(`${runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`);
    expect(response.status).toBe(410);
    await expect(source.resolve(runtime.directory)).rejects.toThrow('No public bundle will be substituted');
  });

  it('revokes an old selection when its manifest identity changes without serving replacement metadata', async () => {
    const runtime = await source.resolve(await bundle());
    await writeFile(path.join(runtime.directory, 'bundle.json'), JSON.stringify({ id, version: '1.197.0.14' }));
    const previousIndex = `${runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`;
    expect((await fetch(previousIndex)).status).toBe(410);
    const replacement = await source.resolve(runtime.directory);
    expect(replacement.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).not.toBe(runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI);
    expect(await (await fetch(`${replacement.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`)).json()).toEqual(
      [runtime.folderVersion]
    );
  });

  it('rejects missing and malformed manifests', async () => {
    const directory = await bundle();
    await writeFile(path.join(directory, 'bundle.json'), 'not-json');
    await expect(readExperimentalBundleSelection(directory)).rejects.toThrow('missing or invalid');
    await rm(path.join(directory, 'bundle.json'));
    await expect(readExperimentalBundleSelection(directory)).rejects.toThrow('missing or invalid');
  });

  it('closes the old endpoint on disposal and can register after reload', async () => {
    const runtime = await source.resolve(await bundle());
    source.dispose();
    await expect(fetch(`${runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`)).rejects.toThrow();
    const next = await source.resolve(runtime.directory);
    expect(next.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).not.toBe(runtime.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI);
  });

  it('does not launch with a source disposed during selection validation', async () => {
    const directory = await bundle();
    const pending = source.resolve(directory);
    source.dispose();
    await expect(pending).rejects.toThrow('disposed before host launch');
    const next = await source.resolve(directory);
    expect(await (await fetch(`${next.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${id}/index.json`)).json()).toEqual([
      '1.197.13',
    ]);
  });
});
