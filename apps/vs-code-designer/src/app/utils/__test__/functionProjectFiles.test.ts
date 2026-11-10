/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseStringPromise } from 'xml2js';
import { assetsFolderName } from '../../../constants';

// Use the real fs-extra implementation to read/write real template and generated files,
// overriding the lightweight fs-extra mock installed by the global test-setup.ts.
vi.unmock('fs-extra');

import * as fse from 'fs-extra';
import { createCsprojFile } from '../functionProjectFiles';

const assetsFolderPath = path.join(__dirname, '..', '..', '..', assetsFolderName);
const net10CsprojTemplatePath = path.join(assetsFolderPath, 'FunctionProjectTemplate', 'FunctionsProjNet10');

async function expectNet10LibraryContract(content: string, logicAppName: string): Promise<void> {
  const { Project: project } = await parseStringPromise(content);

  expect(project.$).toEqual({ Sdk: 'Microsoft.NET.Sdk' });
  expect(project.PropertyGroup).toEqual([
    {
      IsPackable: ['false'],
      TargetFramework: ['net10.0'],
      AzureFunctionsVersion: ['v4'],
      OutputType: ['Library'],
      PlatformTarget: ['AnyCPU'],
      LogicAppFolderToPublish: [`$(MSBuildProjectDirectory)\\..\\${logicAppName}`],
      CopyToOutputDirectory: ['Always'],
      SelfContained: ['false'],
      CopyLocalLockFileAssemblies: ['true'],
    },
  ]);
  expect(project.ItemGroup).toEqual([
    {
      PackageReference: [
        { $: { Include: 'Microsoft.Azure.Functions.Worker.Extensions.Abstractions', Version: '1.3.0' } },
        { $: { Include: 'Microsoft.Azure.Functions.Worker', Version: '2.51.0' } },
        { $: { Include: 'Microsoft.Azure.Functions.Worker.Sdk', Version: '2.0.7' } },
        { $: { Include: 'Microsoft.Azure.Workflows.Webjobs.Sdk', Version: '1.4.1' } },
        { $: { Include: 'Microsoft.Extensions.Logging.Abstractions', Version: '10.0.0' } },
        { $: { Include: 'Microsoft.Extensions.Logging', Version: '10.0.0' } },
      ],
    },
  ]);
  expect(project.Target).toEqual([
    {
      $: { Name: 'TriggerPublishOnBuild', AfterTargets: 'Build' },
      CallTarget: [{ $: { Targets: 'Publish' } }],
    },
  ]);
}

describe('functionProjectFiles - FunctionsProjNet10 template', () => {
  it('preserves the exact library properties, six dependencies and build-triggered publication contract', async () => {
    const templateContent = await fse.readFile(net10CsprojTemplatePath, 'utf-8');

    await expectNet10LibraryContract(templateContent, 'LogicApp');
  });

  it('does not reintroduce application hosting dependencies or obsolete output targets', async () => {
    const templateContent = await fse.readFile(net10CsprojTemplatePath, 'utf-8');

    expect(templateContent).not.toContain('ApplicationInsights');
    expect(templateContent).not.toContain('AspNetCore');
    expect(templateContent).not.toContain('FrameworkReference');
    expect(templateContent).not.toContain('EnsureOutputDirectory');
    expect(templateContent).not.toContain('CopyToNet472Folder');
    expect(templateContent).not.toContain('net472');
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

    it.each(['TestLogicApp', 'My Logic App'])('renders the library contract with sibling publication to %s', async (logicAppName) => {
      const templateBefore = await fse.readFile(net10CsprojTemplatePath, 'utf-8');
      await createCsprojFile(assetsFolderPath, tempDir, 'MyFunction', logicAppName, ProjectType.customCode, TargetFramework.Net10);

      const generatedContent = await fse.readFile(path.join(tempDir, 'MyFunction.csproj'), 'utf-8');
      await expectNet10LibraryContract(generatedContent, logicAppName);
      expect(generatedContent).toBe(
        templateBefore.replace(
          '<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\LogicApp</LogicAppFolderToPublish>',
          `<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\${logicAppName}</LogicAppFolderToPublish>`
        )
      );
      expect(await fse.readFile(net10CsprojTemplatePath, 'utf-8')).toBe(templateBefore);
    });
  });
});
