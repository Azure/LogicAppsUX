import console from 'node:console';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { consumerCompilerOptions, declarationFiles, findPrivateModuleReference, privatePackage } from './package-declaration-guards.mjs';

const [archiveArgument, scratchArgument, existingSiblingTypes] = process.argv.slice(2);
if (!archiveArgument || !scratchArgument) {
  throw new Error(
    'Usage: pnpm --filter @microsoft/logic-apps-designer-v2 test:package-types <package.tgz> <isolated-directory> [sibling-types-directory]'
  );
}

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = resolve(packageDirectory, '..', '..');
const archive = resolve(archiveArgument);
const scratch = resolve(scratchArgument);
const scratchFromRepository = relative(repositoryDirectory, scratch);
if (scratchFromRepository !== '..' && !scratchFromRepository.startsWith(`..${sep}`) && !isAbsolute(scratchFromRepository)) {
  throw new Error('The isolated consumer directory must be outside the repository');
}
if (existsSync(scratch)) {
  throw new Error(`The isolated consumer directory already exists: ${scratch}`);
}

const designerPackage = '@microsoft/logic-apps-designer-v2';
const siblings = [
  ['logic-apps-shared', '@microsoft/logic-apps-shared'],
  ['designer-ui-v2', '@microsoft/designer-ui-v2'],
  ['designer-ui', '@microsoft/designer-ui'],
  ['chatbot', '@microsoft/logic-apps-chatbot'],
];
const consumer = join(scratch, 'consumer');
const nodeModules = join(consumer, 'node_modules');
const packagePath = (name) => join(nodeModules, ...name.split('/'));
const typescriptCompiler = join(repositoryDirectory, 'node_modules', 'typescript', 'bin', 'tsc');

function run(command, args, cwd, exitOnFailure = true) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (exitOnFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.status ?? 1;
}

mkdirSync(packagePath(designerPackage), { recursive: true });
run('tar', ['-xzf', archive, '-C', packagePath(designerPackage), '--strip-components=1'], scratch);

const packedManifest = JSON.parse(readFileSync(join(packagePath(designerPackage), 'package.json'), 'utf8'));
if (packedManifest.name !== designerPackage) {
  throw new Error(`Unexpected package in archive: ${packedManifest.name}`);
}
for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
  if (packedManifest[section]?.[privatePackage]) {
    throw new Error(`The private layout package must not be a published ${section} dependency`);
  }
}

const bundleDirectory = join(packagePath(designerPackage), 'build', 'lib');
const bundle = readFileSync(join(bundleDirectory, 'index.js'), 'utf8');
const sourceMap = JSON.parse(readFileSync(join(bundleDirectory, 'index.js.map'), 'utf8'));
if (
  findPrivateModuleReference(ts.createSourceFile('index.js', bundle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)) ||
  !sourceMap.sources.some((source) => source.replaceAll('\\', '/').includes('/graph-layout/src/elk.ts'))
) {
  throw new Error('The JavaScript bundle must contain the layout engine without importing the private package');
}

for (const file of declarationFiles(bundleDirectory)) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const reference = findPrivateModuleReference(source);
  if (reference) {
    throw new Error(`Packed declaration references the private graph-layout package in ${file}: ${reference}`);
  }
}

for (const [directory, name] of siblings) {
  const project = join(repositoryDirectory, 'libs', directory);
  const typeRoot = existingSiblingTypes ? resolve(existingSiblingTypes) : join(scratch, 'sibling-types');
  const siblingBuild = join(typeRoot, directory, 'build', 'lib');
  if (!existingSiblingTypes) {
    run(
      process.execPath,
      [typescriptCompiler, '-p', join(project, 'tsconfig.json'), '--emitDeclarationOnly', '--outDir', siblingBuild],
      project
    );
  }
  const destination = packagePath(name);
  mkdirSync(destination, { recursive: true });
  cpSync(join(typeRoot, directory, 'build'), join(destination, 'build'), { recursive: true });
  const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
  Object.assign(manifest, manifest.publishConfig);
  delete manifest.publishConfig;
  writeFileSync(join(destination, 'package.json'), JSON.stringify(manifest, null, 2));
}

const excluded = new Set([privatePackage, designerPackage, ...siblings.map(([, name]) => name)]);
const dependencyDirectories = [
  join(packageDirectory, 'node_modules'),
  ...siblings.map(([directory]) => join(repositoryDirectory, 'libs', directory, 'node_modules')),
  join(repositoryDirectory, 'node_modules'),
];

function linkDependency(name, source) {
  const destination = packagePath(name);
  if (excluded.has(name) || existsSync(destination) || !existsSync(source) || !statSync(source).isDirectory()) {
    return;
  }
  mkdirSync(dirname(destination), { recursive: true });
  symlinkSync(realpathSync(source), destination, process.platform === 'win32' ? 'junction' : 'dir');
}

for (const directory of dependencyDirectories) {
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.')) {
      continue;
    }
    const source = join(directory, entry);
    if (entry.startsWith('@') && statSync(source).isDirectory()) {
      for (const scoped of readdirSync(source)) {
        linkDependency(`${entry}/${scoped}`, join(source, scoped));
      }
    } else {
      linkDependency(entry, source);
    }
  }
}

const privateResolution = ts.resolveModuleName(
  privatePackage,
  join(bundleDirectory, 'lib', 'core', 'utils', 'graph.d.ts'),
  { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
  ts.sys
);
if (existsSync(packagePath(privatePackage)) || privateResolution.resolvedModule) {
  throw new Error('The isolated consumer can resolve the private graph-layout package');
}

writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'designer-v2-declaration-consumer', private: true, type: 'module' }));
writeFileSync(
  join(consumer, 'consumer.ts'),
  `import { getTriggerNodeId } from '${designerPackage}';\n` +
    `import type { createElkNode, createElkEdge } from './node_modules/${designerPackage}/build/lib/lib/core/utils/graph.js';\n` +
    'type NotAny<T> = 0 extends 1 & T ? never : T;\n' +
    'const id: string = getTriggerNodeId({} as Parameters<typeof getTriggerNodeId>[0]);\n' +
    "const node: NotAny<ReturnType<typeof createElkNode>> = { id: 'node' };\n" +
    "const edge: NotAny<ReturnType<typeof createElkEdge>> = { id: 'edge', sources: [node.id], targets: [node.id] };\n" +
    'void [id, node, edge];\n'
);

let checkStatus = 0;
for (const moduleResolution of ['bundler', 'node']) {
  const config = {
    compilerOptions: { ...consumerCompilerOptions, moduleResolution },
    include: [
      'consumer.ts',
      'node_modules/@microsoft/logic-apps-designer-v2/build/lib/**/*.d.ts',
      'node_modules/@microsoft/logic-apps-designer-v2/build/lib/**/*.d.mts',
      'node_modules/@microsoft/logic-apps-designer-v2/build/lib/**/*.d.cts',
    ],
  };
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(config, null, 2));
  console.log(`Checking all declarations with ${moduleResolution} module resolution.`);
  const status = run(
    process.execPath,
    [typescriptCompiler, '--project', join(consumer, 'tsconfig.json'), '--pretty', 'false'],
    consumer,
    false
  );
  checkStatus ||= status;
}
if (checkStatus !== 0) {
  process.exit(checkStatus);
}
console.log('Public package and all emitted declarations typechecked without the private graph-layout package.');
