/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { generateExtensionsJson } from '../extensionsGenerator';

describe('generateExtensionsJson', () => {
  it('should include all standard recommendations', () => {
    const result = generateExtensionsJson();

    expect(result.recommendations).toContain('ms-azuretools.vscode-azurelogicapps');
    expect(result.recommendations).toContain('ms-azuretools.vscode-azurefunctions');
    expect(result.recommendations).toContain('ms-dotnettools.csharp');
    expect(result.recommendations).toContain('ms-dotnettools.csdevkit');
  });
});