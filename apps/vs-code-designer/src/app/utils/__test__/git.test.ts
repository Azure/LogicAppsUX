import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import { removeFromGitIgnore } from '../git';

vi.mock('../funcCoreTools/cpUtils', () => ({ executeCommand: vi.fn() }));

describe('removeFromGitIgnore', () => {
  const workspacePath = path.join('test', 'workspace');
  const gitignorePath = path.join(workspacePath, '.gitignore');
  const vscodePattern = () => /^\.vscode(\/|\\)?\s*$/gm;

  beforeEach(() => {
    vi.mocked(fse.pathExists).mockResolvedValue(true);
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
  });

  it('does not rewrite an already-correct gitignore during repeated initialization', async () => {
    const content = Buffer.from('bin\nobj\nlocal.settings.json\n');
    vi.mocked(fse.readFile).mockResolvedValue(content);

    await removeFromGitIgnore(workspacePath, vscodePattern());
    await removeFromGitIgnore(workspacePath, vscodePattern());

    expect(fse.readFile).toHaveBeenCalledWith(gitignorePath);
    expect(fse.writeFile).not.toHaveBeenCalled();
  });

  it('does not rewrite an empty gitignore', async () => {
    vi.mocked(fse.readFile).mockResolvedValue(Buffer.alloc(0));

    await removeFromGitIgnore(workspacePath, vscodePattern());

    expect(fse.writeFile).not.toHaveBeenCalled();
  });

  it.each([
    ['\n', '.vscode'],
    ['\n', '.vscode/'],
    ['\n', '.vscode\\'],
    ['\r\n', '.vscode'],
    ['\r\n', '.vscode/'],
    ['\r\n', '.vscode\\'],
  ])('removes a %j-terminated %j entry and preserves other content', async (newline, entry) => {
    const retained = `bin${newline}obj${newline}.vscode/extensions.json${newline}local.settings.json${newline}`;
    vi.mocked(fse.readFile).mockResolvedValue(Buffer.from(`${retained}${entry}${newline}`));

    await removeFromGitIgnore(workspacePath, vscodePattern());

    expect(fse.writeFile).toHaveBeenCalledExactlyOnceWith(gitignorePath, retained);
  });

  it('does not read or create a missing gitignore', async () => {
    vi.mocked(fse.pathExists).mockResolvedValue(false);

    await removeFromGitIgnore(workspacePath, vscodePattern());

    expect(fse.readFile).not.toHaveBeenCalled();
    expect(fse.writeFile).not.toHaveBeenCalled();
  });

  it('preserves read failures', async () => {
    const error = new Error('read failed');
    vi.mocked(fse.readFile).mockRejectedValue(error);

    await expect(removeFromGitIgnore(workspacePath, vscodePattern())).rejects.toBe(error);
    expect(fse.writeFile).not.toHaveBeenCalled();
  });

  it('preserves write failures when a matching entry must be removed', async () => {
    const error = new Error('write failed');
    vi.mocked(fse.readFile).mockResolvedValue(Buffer.from('.vscode\nbin\n'));
    vi.mocked(fse.writeFile).mockRejectedValue(error);

    await expect(removeFromGitIgnore(workspacePath, vscodePattern())).rejects.toBe(error);
  });
});
