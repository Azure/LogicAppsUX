/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetsFolderName } from '../../../constants';

// Use the real fs-extra implementation to read/write real template and generated files,
// overriding the lightweight fs-extra mock installed by the global test-setup.ts.
vi.unmock('fs-extra');

import * as fse from 'fs-extra';
import { createCsprojFile } from '../functionProjectFiles';

const assetsFolderPath = path.join(__dirname, '..', '..', '..', assetsFolderName);
const net10CsprojTemplatePath = path.join(assetsFolderPath, 'FunctionProjectTemplate', 'FunctionsProjNet10');

describe('functionProjectFiles - FunctionsProjNet10 template', () => {
  it('pins Microsoft.ApplicationInsights.WorkerService to exactly version 2.21.0', async () => {
    const templateContent = await fse.readFile(net10CsprojTemplatePath, 'utf-8');

    expect(templateContent).toContain('<PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.21.0" />');
    expect(templateContent).not.toContain('2.23.0');
  });

  it('still contains the pre-existing CopyToNet472Folder target (must not be removed by this change)', async () => {
    const templateContent = await fse.readFile(net10CsprojTemplatePath, 'utf-8');

    expect(templateContent).toContain('CopyToNet472Folder');
  });

  describe('createCsprojFile for Net10', () => {
    let tempDir: string;

    beforeEach(async () => {
      const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
      tempDir = await fse.mkdtemp(path.join(tmpBase, 'logic-apps-functionprojectfiles-test-'));
    });

    afterEach(async () => {
      await fse.remove(tempDir);
    });

    it('generates a .csproj file with the exact 2.21.0 package reference for Net10 custom code projects', async () => {
      await createCsprojFile(assetsFolderPath, tempDir, 'MyFunction', 'TestLogicApp', ProjectType.customCode, TargetFramework.Net10);

      const generatedContent = await fse.readFile(path.join(tempDir, 'MyFunction.csproj'), 'utf-8');
      expect(generatedContent).toContain('<PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.21.0" />');
      expect(generatedContent).not.toContain('2.23.0');
    });
  });
});
