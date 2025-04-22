import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { verifyLocalConnectionKeys } from '../connectionKeys';
import * as vscode from 'vscode';
import * as workspace from '../../workspace';
import * as verifyIsProject from '../../verifyIsProject';
import * as parameter from '../../codeless/parameter';
import * as common from '../../codeless/common';
import * as connection from '../../codeless/connection';
import * as path from 'path';
import { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../workspace', () => ({
  getWorkspaceLogicAppFolders: vi.fn(),
}));

vi.mock('../codeless/common', () => ({
  getAzureConnectorDetailsForLocalProject: vi.fn(),
}));

vi.mock('../codeless/parameter', () => ({
  getParametersJson: vi.fn(),
}));

vi.mock('../codeless/connection', () => ({
  getConnectionsJson: vi.fn(),
  getConnectionsAndSettingsToUpdate: vi.fn(),
  saveConnectionReferences: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isEmptyString: (value: string) => value === '',
}));

describe('verifyLocalConnectionKeys', () => {
  let testContext: any;
  const testLogicAppName1 = 'LogicApp1';
  const testLogicAppName2 = 'LogicApp2';
  const testLogicAppProjectPath1 = path.join('test', 'project', testLogicAppName1);
  const testLogicAppProjectPath2 = path.join('test', 'project', testLogicAppName2);
  const testWorkspaceFolders = [
    { name: testLogicAppName1, uri: { fsPath: testLogicAppProjectPath1 }, index: 0 },
    { name: testLogicAppName2, uri: { fsPath: testLogicAppProjectPath2 }, index: 1 },
  ];

  beforeEach(() => {
    testContext = { telemetry: { properties: {} } };
    (vscode.workspace as any).workspaceFolders = testWorkspaceFolders;
    ext.outputChannel.appendLog = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing when no workspace folders exist', async () => {
    const getConnectionsJsonSpy = vi.spyOn(connection, 'getConnectionsJson');
    (vscode.workspace as any).workspaceFolders = undefined;
    await verifyLocalConnectionKeys(testContext, testLogicAppProjectPath1);
    expect(getConnectionsJsonSpy).not.toHaveBeenCalled();
  });

  it('should log message when connectionsJson is empty', async () => {
    vi.spyOn(connection, 'getConnectionsJson').mockResolvedValue('');
    await verifyLocalConnectionKeys(testContext, testLogicAppProjectPath1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(localize('noConnectionKeysFound', 'No connection keys found to verify'));
  });

  it('should save connection references when connections exist', async () => {
    const sampleConnections = { managedApiConnections: { conn1: {} } };
    vi.spyOn(connection, 'getConnectionsJson').mockResolvedValue(JSON.stringify(sampleConnections));

    const azureDetails = {
      enabled: true,
      tenantId: '4bb01b15-004c-4b95-9568-5165b5f89c41',
      workflowManagementBaseUrl: 'https://management.azure.com/',
    };
    vi.spyOn(common, 'getAzureConnectorDetailsForLocalProject').mockResolvedValue(azureDetails);

    const parametersData = { param: { type: 'string', value: 'test' } };
    vi.spyOn(parameter, 'getParametersJson').mockResolvedValue(parametersData);

    const connectionsAndSettingsToUpdate = { connections: {}, settings: {} };
    vi.spyOn(connection, 'getConnectionsAndSettingsToUpdate').mockResolvedValue(connectionsAndSettingsToUpdate);
    vi.spyOn(connection, 'saveConnectionReferences').mockResolvedValue(undefined);

    await verifyLocalConnectionKeys(testContext, testLogicAppProjectPath1);

    expect(connection.getConnectionsAndSettingsToUpdate).toHaveBeenCalledWith(
      testContext,
      testLogicAppProjectPath1,
      sampleConnections.managedApiConnections,
      azureDetails.tenantId,
      azureDetails.workflowManagementBaseUrl,
      parametersData
    );
    expect(connection.saveConnectionReferences).toHaveBeenCalledWith(testContext, testLogicAppProjectPath1, connectionsAndSettingsToUpdate);
  });

  it('should save connection references for the user-selected project', async () => {
    vi.spyOn(workspace, 'getWorkspaceFolder').mockResolvedValue(testWorkspaceFolders[0].uri.fsPath);
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(testWorkspaceFolders[0].uri.fsPath);

    const sampleConnections = { managedApiConnections: { conn1: {} } };
    vi.spyOn(connection, 'getConnectionsJson').mockResolvedValue(JSON.stringify(sampleConnections));

    const azureDetails = {
      enabled: true,
      tenantId: '4bb01b15-004c-4b95-9568-5165b5f89c41',
      workflowManagementBaseUrl: 'https://management.azure.com/',
    };
    vi.spyOn(common, 'getAzureConnectorDetailsForLocalProject').mockResolvedValue(azureDetails);

    const parametersData = { param: { type: 'string', value: 'test' } };
    vi.spyOn(parameter, 'getParametersJson').mockResolvedValue(parametersData);

    const connectionsAndSettingsToUpdate = { connections: {}, settings: {} };
    vi.spyOn(connection, 'getConnectionsAndSettingsToUpdate').mockResolvedValue(connectionsAndSettingsToUpdate);
    vi.spyOn(connection, 'saveConnectionReferences').mockResolvedValue(undefined);

    await verifyLocalConnectionKeys(testContext);

    expect(connection.getConnectionsJson).toHaveBeenCalledTimes(1);
    expect(connection.getConnectionsAndSettingsToUpdate).toHaveBeenCalledTimes(1);
    expect(connection.saveConnectionReferences).toHaveBeenCalledTimes(1);
  });

  it('should return without saving connection references when project path is undefined after user selection', async () => {
    vi.spyOn(workspace, 'getWorkspaceFolder').mockResolvedValue(undefined);
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(undefined);
    const getAzureConnectorDetailsSpy = vi
      .spyOn(common, 'getAzureConnectorDetailsForLocalProject')
      .mockResolvedValue({} as AzureConnectorDetails);

    await verifyLocalConnectionKeys(testContext);

    expect(common.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
  });

  it('should throw error when an error occurs during verification', async () => {
    const error = new Error('Test error');
    vi.spyOn(connection, 'getConnectionsJson').mockRejectedValue(error);

    await expect(verifyLocalConnectionKeys(testContext, testLogicAppProjectPath1)).rejects.toThrow(
      'Error while verifying existing managed api connections: Test error'
    );

    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(testContext.telemetry.properties.error).toContain('Test error');
  });
});
