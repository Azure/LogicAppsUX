import * as path from 'path';

export function containsIgnoreCase(value: string, expected: string): boolean {
  return value.toLowerCase().includes(expected.toLowerCase());
}

export function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36).slice(-5)}`;
}

export function normalizeFsPath(fsPath: string, platform: NodeJS.Platform = process.platform): string {
  const normalizedPath = platform === 'win32' ? path.win32.normalize(fsPath) : path.posix.normalize(fsPath);
  return platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
}
