import { describe, it, expect, beforeEach, vi, Mock, beforeAll } from 'vitest';
import { GenerateDeploymentCenterScriptsStep } from '../GenerateDeploymentCenterScriptsStep';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import * as syncCloudSettings from '../../../../syncCloudSettings';
import { ext } from '../../../../../../extensionVariables';
import { IAzureDeploymentScriptsContext } from '../../../generateDeploymentScripts';
import { assetsFolderName } from '../../../../../../constants';

describe('GenerateDeploymentCenterScriptsStep', () => {
  let context: IAzureDeploymentScriptsContext;
  let writeFileSpy: any;

  // Template paths
  let deploymentScriptTemplatePath: string;
  let dotDeploymentTemplatePath: string;
  let readmeTemplatePath: string;

  // Template strings
  let deploymentScriptTemplate: string;
  let dotDeploymentContent: string;
  let readmeContent: string;

  beforeAll(async () => {
    vi.mock('../../../../syncCloudSettings');

    const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
    const rootDir = path.join(__dirname, '..', '..', '..', '..', '..', '..');
    const assetsFolderPath = path.join(rootDir, assetsFolderName);
    deploymentScriptTemplatePath = path.join(assetsFolderPath, 'DeploymentScriptTemplates', 'DeploymentCenterScript');
    deploymentScriptTemplate = await realFs.readFile(deploymentScriptTemplatePath, 'utf8');
    dotDeploymentTemplatePath = path.join(assetsFolderPath, 'DeploymentScriptTemplates', 'dotdeployment');
    dotDeploymentContent = await realFs.readFile(dotDeploymentTemplatePath, 'utf8');
    readmeTemplatePath = path.join(assetsFolderPath, 'DeploymentScriptTemplates', 'DeploymentCenterReadme');
    readmeContent = await realFs.readFile(readmeTemplatePath, 'utf8');
  });

  beforeEach(() => {
    context = {
      telemetry: { properties: {}, measurements: {} },
      subscriptionId: 'test-subscription-id',
      resourceGroup: { name: 'test-resource-group', location: 'test-location' },
      logicAppName: 'test-logic-app',
      localLogicAppName: 'test-local-logic-app',
      uamiClientId: 'test-uami-client-id',
      customWorkspaceFolderPath: '/test/workspace',
      projectPath: '/test/project',
    } as IAzureDeploymentScriptsContext;

    vi.clearAllMocks();
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
      if (p.includes('DeploymentCenterScript')) return deploymentScriptTemplate;
      if (p.includes('dotdeployment')) return dotDeploymentContent;
      if (p.includes('DeploymentCenterReadme')) return readmeContent;
      throw new Error(`File not found: ${p}`);
    });
    vi.spyOn(fse, 'ensureDir').mockResolvedValue(undefined);
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(vscode.workspace, 'updateWorkspaceFolders').mockReturnValue(true);
    vi.spyOn(syncCloudSettings, 'syncCloudSettings').mockResolvedValue(undefined);
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
  });

  it('should generate deployment scripts and update workspace folders', async () => {
    const step = new GenerateDeploymentCenterScriptsStep();
    await step.execute(context);

    expect(fse.readFile).toHaveBeenCalledWith(expect.stringContaining('DeploymentCenterScript'), 'utf-8');
    expect(fse.readFile).toHaveBeenCalledWith(expect.stringContaining('dotdeployment'), 'utf-8');
    expect(fse.readFile).toHaveBeenCalledWith(expect.stringContaining('DeploymentCenterReadme'), 'utf-8');

    const deploymentDirectoryPath = path.join(context.customWorkspaceFolderPath as string, 'deployment');
    expect(fse.ensureDir).toHaveBeenCalledWith(deploymentDirectoryPath);
    expect(writeFileSpy).toHaveBeenCalledWith(path.join(deploymentDirectoryPath, 'deploy.ps1'), expect.any(String));

    const writeDeploymentScriptCall = writeFileSpy.mock.calls.find((args) => args[0].endsWith('deploy.ps1'));
    expect(writeDeploymentScriptCall).toBeDefined();
    expect(writeDeploymentScriptCall[1]).toContain(`$subscriptionId = "${context.subscriptionId}"`);
    expect(writeDeploymentScriptCall[1]).toContain(`$resourceGroup = "${context.resourceGroup.name}"`);
    expect(writeDeploymentScriptCall[1]).toContain(`$location = "${context.resourceGroup.location}"`);
    expect(writeDeploymentScriptCall[1]).toContain(`$logicAppName = "${context.logicAppName}"`);
    expect(writeDeploymentScriptCall[1]).toContain(`$localLogicAppName = "${context.localLogicAppName}"`);
    expect(writeDeploymentScriptCall[1]).toContain(`$clientId = "${context.uamiClientId}"`);
    expect(writeDeploymentScriptCall[1]).not.toContain('<%=');
    expect(writeDeploymentScriptCall[1]).not.toContain('%>');

    expect(writeFileSpy).toHaveBeenCalledWith(path.join(context.customWorkspaceFolderPath as string, '.deployment'), dotDeploymentContent);
    expect(writeFileSpy).toHaveBeenCalledWith(path.join(deploymentDirectoryPath, 'README.md'), readmeContent);

    expect(vscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(0, undefined, {
      uri: { fsPath: deploymentDirectoryPath, toString: expect.any(Function) },
    });

    expect(syncCloudSettings.syncCloudSettings).toHaveBeenCalledWith(context, expect.any(Object));

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Custom deployment script for Azure Deployment Center generated successfully')
    );
  });
});
