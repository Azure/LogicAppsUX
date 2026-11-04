import { describe, test, expect } from 'vitest';
import * as vscode from 'vscode';
import { getDuplicateSafeName, getWorkspaceRoot, getWorkspaceRootForMap, validateWorkspaceName } from '../src/workspaceStructure';

describe('data map workspace structure', () => {
  test('allocates duplicate-safe map names case-insensitively', () => {
    expect(getDuplicateSafeName('map', '.btm', [])).toBe('map.btm');
    expect(getDuplicateSafeName('map', '.btm', ['map.btm'])).toBe('map(1).btm');
    expect(getDuplicateSafeName('map', '.btm', ['MAP.BTM', 'map(1).btm', 'map(2).btm'])).toBe('map(3).btm');
    expect(getDuplicateSafeName('map', '.lml', ['map.btm'])).toBe('map.lml');
    expect(getDuplicateSafeName('map', '.lml', ['MAP.LML', 'map.btm'])).toBe('map(1).lml');
  });

  test.each(['', '   ', '.', '..', 'bad/name', 'bad\\name', 'bad:name', 'trailing.', 'trailing ', 'CON', 'nul.txt', 'COM1'])(
    'rejects invalid workspace name %j',
    (name) => {
      expect(validateWorkspaceName(name)).toBeDefined();
    }
  );

  test('accepts a valid workspace name', () => {
    expect(validateWorkspaceName('Customer Maps')).toBeUndefined();
    expect(validateWorkspaceName('Customer.Maps')).toBeUndefined();
  });

  test('keeps dotted workspace folders as roots', () => {
    const workspaceUri = vscode.Uri.parse('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');

    expect(getWorkspaceRoot(workspaceUri).toString()).toBe(workspaceUri.toString());
  });

  test.each(['btm', 'lml'])('preserves the URI scheme when finding a %s workspace root', (extension) => {
    const mapUri = vscode.Uri.parse(`vscode-remote://ssh-remote+host/workspaces/Customer.Maps/map.${extension}`);

    expect(getWorkspaceRoot(mapUri).toString()).toBe('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');
    expect(getWorkspaceRootForMap(mapUri).toString()).toBe('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');
  });
});
