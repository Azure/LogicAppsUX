import path from 'path';
import { existsSync, removeSync, statSync } from 'fs-extra';

export function findUp(names: string | string[], from: string, stopOnNodeModules = false) {
  if (!Array.isArray(names)) {
    names = [names];
  }
  const root = path.parse(from).root;

  let currentDir = from;
  while (currentDir && currentDir !== root) {
    for (const name of names) {
      const p = path.join(currentDir, name);
      if (existsSync(p)) {
        return p;
      }
    }

    if (stopOnNodeModules) {
      const nodeModuleP = path.join(currentDir, 'node_modules');
      if (existsSync(nodeModuleP)) {
        return null;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function findAllNodeModules(from: string, root?: string) {
  const nodeModules: string[] = [];

  let current = from;
  while (current && current !== root) {
    const potential = path.join(current, 'node_modules');
    if (existsSync(potential) && isDirectory(potential)) {
      nodeModules.push(potential);
    }

    const next = path.dirname(current);
    if (next === current) {
      break;
    }
    current = next;
  }

  return nodeModules;
}

/**
 * Delete an output directory, but error out if it's the root of the project.
 */
export function deleteOutputDir(root: string, outputPath: string) {
  const resolvedOutputPath = path.resolve(root, outputPath);
  if (resolvedOutputPath === root) {
    throw new Error('Output path MUST not be project root directory!');
  }

  removeSync(resolvedOutputPath);
}

export function isDirectory(path: string) {
  try {
    return statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}
