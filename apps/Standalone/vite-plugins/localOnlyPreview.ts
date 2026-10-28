import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

const withoutQuery = (id: string): string => normalizePath(id.split(/[?#]/)[0]);

const isPrivateConfiguration = (id: string): boolean =>
  id.includes('/environments/jsonImport/') || /\/(?:armToken|foundryToken|subscriptionIds)\.json$/i.test(id);

export const localOnlyPreview = (): Plugin => {
  const replacements = new Map<string, string>();
  let faviconPath = '';

  return {
    name: 'local-only-preview',
    apply: 'build',
    enforce: 'pre',
    config() {
      return {
        base: '/',
        // Public directories can contain developer-local subscription lists or auth redirect pages.
        publicDir: false,
        build: { sourcemap: false, emptyOutDir: true, copyPublicDir: false },
      };
    },
    configResolved(config) {
      if (!config.isProduction) {
        throw new Error('Local-only previews require a production build.');
      }
      replacements.clear();
      for (const [source, replacement] of [
        ['src/environments/environment.ts', 'src/environments/environment.ephemeral.ts'],
        ['src/App.tsx', 'src/App.ephemeral.tsx'],
      ]) {
        replacements.set(normalizePath(resolve(config.root, source)), normalizePath(resolve(config.root, replacement)));
      }
      faviconPath = resolve(config.root, 'public/vite.svg');
    },
    async resolveId(source, importer) {
      if (!/(?:^|[/\\])(?:environment(?:\.ts)?|App(?:\.tsx)?)(?:[?#].*)?$/.test(source)) {
        return null;
      }
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved ? (replacements.get(withoutQuery(resolved.id)) ?? null) : null;
    },
    load(id) {
      const path = withoutQuery(id);
      if (replacements.has(path) || isPrivateConfiguration(path)) {
        this.error('Developer authentication or subscription configuration cannot be included in a local-only preview.');
      }
      return null;
    },
    async generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }
        if (
          Object.keys(output.modules).some((id) => replacements.has(withoutQuery(id)) || isPrivateConfiguration(withoutQuery(id))) ||
          output.code.includes('/__dev/armToken')
        ) {
          this.error('Developer authentication code cannot be emitted in a local-only preview.');
        }
      }
      // Only the reviewed favicon is needed from public for the local-workflow profile.
      this.emitFile({ type: 'asset', fileName: 'vite.svg', source: await readFile(faviconPath) });
    },
  };
};
