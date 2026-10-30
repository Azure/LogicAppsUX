import { execFileSync } from 'node:child_process';
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const legacyRoot = 'libs/designer-ui/src/lib/';
const requiredPeers = ['@fluentui/react-components', 'react', 'react-dom'];

export function checkManifest(manifest) {
  const errors = [];
  if (manifest.private !== true) {
    errors.push('designer-ui-v2 must remain private until its publication gates are approved.');
  }
  const peers = Object.keys(manifest.peerDependencies ?? {}).sort();
  const dependencies = Object.keys(manifest.dependencies ?? {});
  if (JSON.stringify(peers) !== JSON.stringify(requiredPeers)) {
    errors.push(`Required peers must be exactly: ${requiredPeers.join(', ')}.`);
  }
  if (dependencies.length !== 1 || dependencies[0] !== '@fluentui/react-icons') {
    errors.push('The only runtime dependency must be @fluentui/react-icons.');
  }
  if (requiredPeers.some((peer) => manifest.peerDependenciesMeta?.[peer]?.optional)) {
    errors.push('Required UI peers must not be optional.');
  }
  if (Object.keys(manifest.optionalDependencies ?? {}).length || manifest.bundledDependencies || manifest.bundleDependencies) {
    errors.push('Optional and bundled runtime dependencies are not permitted.');
  }
  return errors;
}

function componentFolders(files) {
  return new Set(
    files
      .filter((file) => file.startsWith(legacyRoot) && file.slice(legacyRoot.length).includes('/'))
      .map((file) => file.slice(legacyRoot.length).split('/')[0])
  );
}

export function newLegacyFolders(baseFiles, currentFiles) {
  const existing = componentFolders(baseFiles);
  return [...componentFolders(currentFiles)].filter((folder) => !existing.has(folder)).sort();
}

export function resolveBaseRef(baseRef) {
  return !baseRef || /^0{40}$/.test(baseRef) ? 'origin/main' : baseRef;
}

function gitLines(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

function main(baseRef) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'libs/designer-ui-v2/package.json'), 'utf8'));
  const errors = checkManifest(manifest);
  const [base] = gitLines(['merge-base', 'HEAD', resolveBaseRef(baseRef)]);
  const baseFiles = gitLines(['ls-tree', '-r', '--name-only', base, '--', legacyRoot]);
  const currentFiles = gitLines(['ls-files', '--cached', '--others', '--exclude-standard', '--', legacyRoot]);
  for (const folder of newLegacyFolders(baseFiles, currentFiles)) {
    errors.push(`designer-ui is frozen; add new components to designer-ui-v2, not ${legacyRoot}${folder}/.`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('Designer UI dependency and legacy-folder policies passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2] ?? 'origin/main');
}
