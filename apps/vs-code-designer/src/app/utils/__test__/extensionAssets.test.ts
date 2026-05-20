import { existsSync, type PathLike } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { getExtensionAssetPath } from '../extensionAssets';

const normalizePathLike = (candidateRoot: PathLike): string =>
  typeof candidateRoot === 'string' ? candidateRoot : candidateRoot.toString();

describe('getExtensionAssetPath', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    ext.context = undefined as any;
  });

  afterEach(() => {
    ext.context = undefined as any;
  });

  it('uses the extension context path when available', () => {
    const asAbsolutePathMock = vi.fn((relativePath: string) => `mocked/extension/${relativePath}`);

    ext.context = {
      asAbsolutePath: asAbsolutePathMock,
    } as any;

    const assetPath = getExtensionAssetPath('readmes', 'importReadMe.md');

    expect(assetPath).toBe(`mocked/extension/${path.join('assets', 'readmes', 'importReadMe.md')}`);
    expect(asAbsolutePathMock).toHaveBeenCalledWith(path.join('assets', 'readmes', 'importReadMe.md'));
    expect(existsSync).not.toHaveBeenCalled();
  });

  it('falls back to the source assets folder layout when present', () => {
    vi.mocked(existsSync).mockImplementation((candidateRoot: PathLike) =>
      normalizePathLike(candidateRoot).endsWith(path.join('src', 'assets'))
    );

    const assetPath = getExtensionAssetPath('scripts', 'get-child-processes.ps1');

    expect(assetPath.endsWith(path.join('src', 'assets', 'scripts', 'get-child-processes.ps1'))).toBe(true);
  });

  it('falls back to the packaged assets folder layout when source assets are not present', () => {
    vi.mocked(existsSync).mockImplementation((candidateRoot: PathLike) =>
      normalizePathLike(candidateRoot).endsWith(path.join('vs-code-designer', 'assets'))
    );

    const assetPath = getExtensionAssetPath('ContainerTemplates', 'devcontainer.json');

    expect(assetPath.endsWith(path.join('vs-code-designer', 'assets', 'ContainerTemplates', 'devcontainer.json'))).toBe(true);
  });

  it('returns the first fallback candidate when neither assets layout exists', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const assetPath = getExtensionAssetPath('WorkspaceTemplates', 'ExtensionsJsonFile');

    expect(assetPath.endsWith(path.join('src', 'assets', 'WorkspaceTemplates', 'ExtensionsJsonFile'))).toBe(true);
  });
});
