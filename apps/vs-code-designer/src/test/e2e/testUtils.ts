import * as path from 'path';

export function containsIgnoreCase(value: string, expected: string): boolean {
  return value.toLowerCase().includes(expected.toLowerCase());
}

export function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36).slice(-5)}`;
}

export function normalizeFsPath(fsPath: string): string {
  const normalizedPath = path.normalize(fsPath);
  return process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
}
