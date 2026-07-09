import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { refreshConnectionKeys } from '../connectionKeys';
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

describe('refreshConnectionKeys', () => {
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
    testContext = {
      telemetry: {
        properties: {},
        measurements: {},
      },
    };
    (vscode.workspace as any).workspaceFolders = testWorkspaceFolders;
    ext.outputChannel.appendLog = vi.fn();
    vi.spyOn(common, 'getAzureConnectorDetailsForLocalProject').mockResolvedValue({
      enabled: true,
      tenantId: '4bb01b15-004c-4b95-9568-5165b5f89c41',
      workflowManagementBaseUrl: 'https://management.azure.com/',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing when no workspace folders exist', async () => {
    const getConnectionsJsonSpy = vi.spyOn(connection, 'getConnectionsJson');
    (vscode.workspace as any).workspaceFolders = undefined;
    await refreshConnectionKeys(testContext, testLogicAppProjectPath1);
    expect(getConnectionsJsonSpy).not.toHaveBeenCalled();
  });

  it('should log message when connectionsJson is empty', async () => {
    vi.spyOn(connection, 'getConnectionsJson').mockResolvedValue('');
    await refreshConnectionKeys(testContext, testLogicAppProjectPath1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(localize('noConnectionKeysFound', 'No connection keys found.'));
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

    await refreshConnectionKeys(testContext, testLogicAppProjectPath1);

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

  it('should skip connection key verification when Azure connectors are disabled', async () => {
    vi.spyOn(common, 'getAzureConnectorDetailsForLocalProject').mockResolvedValue({ enabled: false } as AzureConnectorDetails);
    const getConnectionsJsonSpy = vi
      .spyOn(connection, 'getConnectionsJson')
      .mockResolvedValue(JSON.stringify({ managedApiConnections: { conn1: {} } }));

    await refreshConnectionKeys(testContext, testLogicAppProjectPath1);

    expect(getConnectionsJsonSpy).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Azure connectors are disabled. Skipping connection key refresh.');
  });

  it('should throw error when an error occurs during verification', async () => {
    const error = new Error('Test error');
    vi.spyOn(connection, 'getConnectionsJson').mockRejectedValue(error);

    await expect(refreshConnectionKeys(testContext, testLogicAppProjectPath1)).rejects.toThrow(
      'Error while refreshing existing managed api connections: Test error'
    );

    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(testContext.telemetry.properties.error).toContain('Test error');
  });
});
