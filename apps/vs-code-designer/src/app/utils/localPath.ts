/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';

const windowsDriveAbsolutePath = /^[A-Za-z]:[\\/]/;
const windowsUncPath = /^\\\\[^\\/]+[\\/][^\\/]+/;

function isWindowsAbsolutePath(localPath: string): boolean {
  return windowsDriveAbsolutePath.test(localPath) || windowsUncPath.test(localPath);
}

function trimTrailingSeparators(localPath: string, root: string): string {
  return localPath.length > root.length ? localPath.replace(/[\\/]+$/, '') : localPath;
}

export function canonicalizeLocalPath(localPath: string): string {
  if (isWindowsAbsolutePath(localPath)) {
    const normalizedPath = path.win32.normalize(localPath);
    return trimTrailingSeparators(normalizedPath, path.win32.parse(normalizedPath).root).toLowerCase();
  }

  if (path.posix.isAbsolute(localPath)) {
    const normalizedPath = path.posix.normalize(localPath);
    return trimTrailingSeparators(normalizedPath, path.posix.parse(normalizedPath).root);
  }

  const normalizedPath = path.normalize(path.resolve(localPath));
  const canonicalPath = trimTrailingSeparators(normalizedPath, path.parse(normalizedPath).root);
  return process.platform === 'win32' ? canonicalPath.toLowerCase() : canonicalPath;
}
