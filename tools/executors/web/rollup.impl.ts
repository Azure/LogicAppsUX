import * as rollup from 'rollup';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { getBabelInputPlugin } from '@rollup/plugin-babel';
import { join, relative } from 'path';
import { from, Observable, of } from 'rxjs';
import { catchError, concatMap, last, scan, tap } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import autoprefixer from 'autoprefixer';
import type { ExecutorContext, ProjectGraphExternalNode, ProjectGraphProjectNode } from '@nrwl/devkit';
import { logger, names, readJsonFile, writeJsonFile } from '@nrwl/devkit';
import { readCachedProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import {
  calculateProjectDependencies,
  checkDependentProjectsHaveBeenBuilt,
  computeCompilerOptionsPaths,
  DependentBuildableProjectNode,
  updateBuildableProjectPackageJsonDependencies,
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import resolve from '@rollup/plugin-node-resolve';

import { AssetGlobPattern } from './lib/models';
import { WebRollupOptions } from './schema';
import { runRollup } from './lib/run-rollup';
import { NormalizedWebRollupOptions, normalizeWebRollupOptions } from './lib/normalize';
import { analyze } from './lib/analyze-plugin';
import { deleteOutputDir } from './lib/fs';

// These use require because the ES import isn't correct.
const commonjs = require('@rollup/plugin-commonjs');
const image = require('@rollup/plugin-image');
const json = require('@rollup/plugin-json');
const copy = require('rollup-plugin-copy');
const postcss = require('rollup-plugin-postcss');

const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];

export default async function* rollupExecutor(rawOptions: WebRollupOptions, context: ExecutorContext) {
  const project = context.workspace.projects[context.projectName];
  const projectGraph = readCachedProjectGraph();
  const sourceRoot = project.sourceRoot;
  const { target, dependencies } = calculateProjectDependencies(
    projectGraph,
    context.root,
    context.projectName,
    context.targetName,
    context.configurationName
  );
  if (!checkDependentProjectsHaveBeenBuilt(context.root, context.projectName, context.targetName, dependencies)) {
    throw new Error();
  }

  const options = normalizeWebRollupOptions(rawOptions, context.root, sourceRoot);
  const packageJson = readJsonFile(options.project);

  const npmDeps = (projectGraph.dependencies[context.projectName] ?? [])
    .filter((d) => d.target.startsWith('npm:'))
    .map((d) => d.target.substr(4));

  const rollupOptions = createRollupOptions(options, dependencies, context, packageJson, sourceRoot, npmDeps);

  if (options.watch) {
    const watcher = rollup.watch(rollupOptions);
    return yield* eachValueFrom(
      new Observable<{ success: boolean }>((obs) => {
        watcher.on('event', (data) => {
          if (data.code === 'START') {
            logger.info(`Bundling ${context.projectName}...`);
          } else if (data.code === 'END') {
            updatePackageJson(options, context, target, dependencies, packageJson);
            logger.info('Bundle complete. Watching for file changes...');
            obs.next({ success: true });
          } else if (data.code === 'ERROR') {
            logger.error(`Error during bundle: ${data.error.message}`);
            obs.next({ success: false });
          }
        });
        // Teardown logic. Close watcher when unsubscribed.
        return () => watcher.close();
      })
    );
  } else {
    logger.info(`Bundling ${context.projectName}...`);

    // Delete output path before bundling
    if (options.deleteOutputPath) {
      deleteOutputDir(context.root, options.outputPath);
    }

    const start = process.hrtime.bigint();

    return from(rollupOptions)
      .pipe(
        concatMap((opts) =>
          runRollup(opts).pipe(
            catchError((e) => {
              logger.error(`Error during bundle: ${e}`);
              return of({ success: false });
            })
          )
        ),
        scan(
          (acc, result) => {
            if (!acc.success) return acc;
            return result;
          },
          { success: true }
        ),
        last(),
        tap({
          next: (result) => {
            if (result.success) {
              const end = process.hrtime.bigint();
              const duration = `${(Number(end - start) / 1_000_000_000).toFixed(2)}s`;

              updatePackageJson(options, context, target, dependencies, packageJson);
              logger.info(`⚡ Done in ${duration}`);
            } else {
              logger.error(`Bundle failed: ${context.projectName}`);
            }
          },
        })
      )
      .toPromise();
  }
}

// -----------------------------------------------------------------------------

function getPluginsForRollup(
  options: NormalizedWebRollupOptions,
  dependencies: DependentBuildableProjectNode[],
  context: ExecutorContext,
  sourceRoot: string,
  format: 'esm' | 'umd' | 'cjs'
): any[] {
  return [
    copy({
      targets: convertCopyAssetsToRollupOptions(options.outputPath, options.assets),
    }),
    image(),
    require('rollup-plugin-typescript2')({
      check: true,
      tsconfig: options.tsConfig,
      tsconfigOverride: {
        compilerOptions: createCompilerOptions(format, options, dependencies),
      },
    }),
    peerDepsExternal({
      packageJsonPath: options.project,
    }),
    postcss({
      inject: true,
      extract: options.extractCss,
      autoModules: true,
      plugins: [autoprefixer],
    }),
    resolve({
      preferBuiltins: true,
      extensions: fileExtensions,
    }),
    getBabelInputPlugin({
      // Let's `@nrwl/web/babel` preset know that we are packaging.
      caller: {
        // @ts-ignore
        // Ignoring type checks for caller since we have custom attributes
        isNxPackage: true,
        // Always target esnext and let rollup handle cjs/umd
        supportsStaticESM: true,
        isModern: true,
      },
      cwd: join(context.root, sourceRoot),
      rootMode: 'upward',
      babelrc: true,
      extensions: fileExtensions,
      babelHelpers: 'bundled',
      skipPreflightCheck: true, // pre-flight check may yield false positives and also slows down the build
      exclude: /node_modules/,
      plugins: [format === 'esm' ? undefined : require.resolve('babel-plugin-transform-async-to-promises')].filter(Boolean),
    }),
    commonjs(),
    analyze(),
    json(),
  ];
}

export function createRollupOptions(
  options: NormalizedWebRollupOptions,
  dependencies: DependentBuildableProjectNode[],
  context: ExecutorContext,
  packageJson: any,
  sourceRoot: string,
  npmDeps: string[]
): rollup.InputOptions[] {
  const globals = options.globals
    ? options.globals.reduce(
        (acc, item) => {
          acc[item.moduleId] = item.global;
          return acc;
        },
        { 'react/jsx-runtime': 'jsxRuntime' }
      )
    : { 'react/jsx-runtime': 'jsxRuntime' };

  const externalPackages = dependencies
    .map((d) => d.name)
    .concat(options.external || [])
    .concat(Object.keys(packageJson.dependencies || {}));

  const rollupConfigESM = {
    input: options.entryFile,
    output: {
      globals,
      format: 'esm',
      dir: `${options.outputPath}`,
      name: options.umdName || names(context.projectName).className,
      entryFileNames: `[name].esm.js`,
      chunkFileNames: `[name].esm.js`,
    },
    external: (id) =>
      externalPackages.some((name) => id === name || id.startsWith(`${name}/`)) ||
      npmDeps.some((name) => id === name || id.startsWith(`${name}/`)), // Could be a deep import
    plugins: getPluginsForRollup(options, dependencies, context, sourceRoot, 'esm'),
  };

  const esmOptions = options.rollupConfig.reduce((currentConfig, plugin) => {
    return require(plugin)(currentConfig, options);
  }, rollupConfigESM);

  const rollupConfigCJS = {
    input: options.entryFile,
    output: {
      globals,
      format: 'umd',
      inlineDynamicImports: true,
      dir: `${options.outputPath}`,
      name: options.umdName || names(context.projectName).className,
      entryFileNames: `[name].js`,
      chunkFileNames: `[name].js`,
    },
    external: (id) =>
      externalPackages.some((name) => id === name || id.startsWith(`${name}/`)) ||
      npmDeps.some((name) => id === name || id.startsWith(`${name}/`)), // Could be a deep import
    plugins: getPluginsForRollup(options, dependencies, context, sourceRoot, 'esm'),
  };

  const cjsOptions = options.rollupConfig.reduce((currentConfig, plugin) => {
    return require(plugin)(currentConfig, options);
  }, rollupConfigCJS);

  return [esmOptions, cjsOptions];
}

function createCompilerOptions(format, options, dependencies) {
  const compilerOptionPaths = computeCompilerOptionsPaths(options.tsConfig, dependencies);

  const compilerOptions = {
    rootDir: options.entryRoot,
    allowJs: false,
    declaration: true,
    paths: compilerOptionPaths,
  };

  if (format !== 'esm') {
    return {
      ...compilerOptions,
      target: 'es5',
      downlevelIteration: true,
    };
  }

  return compilerOptions;
}

function updatePackageJson(
  options: NormalizedWebRollupOptions,
  context: ExecutorContext,
  target: ProjectGraphProjectNode,
  dependencies: DependentBuildableProjectNode[],
  packageJson: any
) {
  const typingsFile = relative(options.entryRoot, options.entryFile).replace(/\.[jt]sx?$/, '.d.ts');

  if (!packageJson.main) {
    packageJson.main = 'index.js';
  }

  // Update module field
  if (!packageJson.module) {
    packageJson.module = 'index.esm.js';
  }

  // Update typings field
  if (!packageJson.typings) {
    packageJson.typings = `./${typingsFile}`;
  }

  writeJsonFile(`${options.outputPath}/package.json`, packageJson);

  if (dependencies.length > 0 && options.updateBuildableProjectDepsInPackageJson) {
    updateBuildableProjectPackageJsonDependencies(
      context.root,
      context.projectName,
      context.targetName,
      context.configurationName,
      target,
      dependencies,
      options.buildableProjectDepsInPackageJsonType
    );
  }
}

interface RollupCopyAssetOption {
  src: string;
  dest: string;
}

function convertCopyAssetsToRollupOptions(outputPath: string, assets: AssetGlobPattern[]): RollupCopyAssetOption[] {
  return assets
    ? assets.map((a) => ({
        src: join(a.input, a.glob).replace(/\\/g, '/'),
        dest: join(outputPath, a.output).replace(/\\/g, '/'),
      }))
    : undefined;
}
