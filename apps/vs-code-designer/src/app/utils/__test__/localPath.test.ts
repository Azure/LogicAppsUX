/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { canonicalizeLocalPath } from '../localPath';

describe('canonicalizeLocalPath', () => {
  it('uses Windows semantics for drive-absolute paths on every host', () => {
    expect(canonicalizeLocalPath('D:\\Workspace\\LogicApp\\.\\')).toBe('d:\\workspace\\logicapp');
    expect(canonicalizeLocalPath('d:/workspace/logicapp')).toBe('d:\\workspace\\logicapp');
    expect(canonicalizeLocalPath('D:\\')).toBe('d:\\');
  });

  it('uses Windows semantics for UNC paths on every host', () => {
    expect(canonicalizeLocalPath('\\\\Server\\Share\\LogicApp\\..\\Workflow\\.')).toBe('\\\\server\\share\\workflow');
    expect(canonicalizeLocalPath('\\\\server/share/workflow/')).toBe('\\\\server\\share\\workflow');
  });

  it('preserves POSIX case and root semantics', () => {
    expect(canonicalizeLocalPath('/Workspace/LogicApp/./')).toBe('/Workspace/LogicApp');
    expect(canonicalizeLocalPath('/workspace/logicapp')).not.toBe(canonicalizeLocalPath('/Workspace/LogicApp'));
    expect(canonicalizeLocalPath('/')).toBe('/');
  });

  it('uses host semantics only for relative paths', () => {
    const expected = path.normalize(path.resolve('workspace', 'logicapp'));
    expect(canonicalizeLocalPath(path.join('workspace', 'logicapp'))).toBe(
      process.platform === 'win32' ? expected.toLowerCase() : expected
    );
  });
});
