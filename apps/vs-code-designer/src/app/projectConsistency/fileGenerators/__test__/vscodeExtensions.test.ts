/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { generateExtensionsJson } from '../vscodeExtensions';

describe('generateExtensionsJson', () => {
  it('should include all standard recommendations', () => {
    const result = generateExtensionsJson();

    expect(result.recommendations).toEqual([
      'ms-azuretools.vscode-azurelogicapps',
      'ms-dotnettools.csharp',
      'ms-azuretools.vscode-azurefunctions',
      'ms-dotnettools.csdevkit',
    ]);
  });
});
