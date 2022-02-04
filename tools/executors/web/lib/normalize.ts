import { WebRollupOptions } from '../schema';
import { normalizePath } from '@nrwl/devkit';
import { basename, dirname, relative, resolve } from 'path';
import { statSync } from 'fs';
import { AssetGlobPattern } from './models';

export function normalizePluginPath(pluginPath: void | string, root: string) {
  if (!pluginPath) {
    return '';
  }
  try {
    return require.resolve(pluginPath);
  } catch {
    return resolve(root, pluginPath);
  }
}

export function normalizeAssets(assets: any[], root: string, sourceRoot: string): AssetGlobPattern[] {
  return assets.map((asset) => {
    if (typeof asset === 'string') {
      const assetPath = normalizePath(asset);
      const resolvedAssetPath = resolve(root, assetPath);
      const resolvedSourceRoot = resolve(root, sourceRoot);

      if (!resolvedAssetPath.startsWith(resolvedSourceRoot)) {
        throw new Error(`The ${resolvedAssetPath} asset path must start with the project source root: ${sourceRoot}`);
      }

      const isDirectory = statSync(resolvedAssetPath).isDirectory();
      const input = isDirectory ? resolvedAssetPath : dirname(resolvedAssetPath);
      const output = relative(resolvedSourceRoot, resolve(root, input));
      const glob = isDirectory ? '**/*' : basename(resolvedAssetPath);
      return {
        input,
        output,
        glob,
      };
    } else {
      if (asset.output.startsWith('..')) {
        throw new Error('An asset cannot be written to a location outside of the output path.');
      }

      const assetPath = normalizePath(asset.input);
      const resolvedAssetPath = resolve(root, assetPath);
      return {
        ...asset,
        input: resolvedAssetPath,
        // Now we remove starting slash to make Webpack place it from the output root.
        output: asset.output.replace(/^\//, ''),
      };
    }
  });
}

export interface NormalizedWebRollupOptions extends WebRollupOptions {
  entryRoot: string;
  projectRoot: string;
  assets: AssetGlobPattern[];
  rollupConfig: string[];
}

export function normalizeWebRollupOptions(options: WebRollupOptions, root: string, sourceRoot: string): NormalizedWebRollupOptions {
  const entryFile = `${root}/${options.entryFile}`;
  const entryRoot = dirname(entryFile);
  const project = `${root}/${options.project}`;
  const projectRoot = dirname(project);
  const outputPath = `${root}/${options.outputPath}`;

  if (options.buildableProjectDepsInPackageJsonType == undefined) {
    options.buildableProjectDepsInPackageJsonType = 'peerDependencies';
  }

  return {
    ...options,
    rollupConfig: []
      .concat(options.rollupConfig)
      .filter(Boolean)
      .map((p) => normalizePluginPath(p, root)),
    assets: options.assets ? normalizeAssets(options.assets, root, sourceRoot) : undefined,
    entryFile,
    entryRoot,
    project,
    projectRoot,
    outputPath,
  };
}
