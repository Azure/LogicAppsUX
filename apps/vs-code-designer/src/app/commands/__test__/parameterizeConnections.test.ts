import { beforeEach, afterEach, describe, expect, it, vi, test } from 'vitest';
import { parameterizeConnections } from '../parameterizeConnections';
import { ext } from '../../../extensionVariables';
import * as localizeUtil from '../../../localize';
import * as vscode from 'vscode';
import * as path from 'path';
import * as connectionUtil from '../../utils/codeless/connection';
import * as parameterUtil from '../../utils/codeless/parameter';
import * as localSettingsUtil from '../../utils/appSettings/localSettings';
import * as parameterizerUtil from '../../utils/codeless/parameterizer';
import * as workspaceUtil from '../../utils/workspace';

describe('parameterizeConnections', () => {
  const testContext: any = {
    telemetry: { properties: {} },
  };
  const testLogicAppName1 = 'LogicApp1';
  const testLogicAppName2 = 'LogicApp2';
  const testLogicAppProjectPath1 = path.join('test', 'project', testLogicAppName1);
  const testLogicAppProjectPath2 = path.join('test', 'project', testLogicAppName2);
  const testConnectionsJson = JSON.stringify({
    customConnections: {
      conn1: { id: 'conn1', value: 'original' },
    },
    serviceProviderConnections: {},
  });
  const testParametersJson = { param1: { type: 'string', value: 'test' } };
  const testLocalSettings = { Values: { setting1: 'value1' } };
  const testWorkspaceFolders = [
    { name: testLogicAppName1, uri: { fsPath: testLogicAppProjectPath1 }, index: 0 },
    { name: testLogicAppName2, uri: { fsPath: testLogicAppProjectPath2 }, index: 1 },
  ];

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = testWorkspaceFolders;
    testContext.telemetry.properties = {};

    vi.spyOn(workspaceUtil, 'getWorkspaceLogicAppFolders').mockResolvedValue(testWorkspaceFolders.map((folder) => folder.uri.fsPath));
    vi.spyOn(connectionUtil, 'getConnectionsJson').mockResolvedValue(testConnectionsJson);
    vi.spyOn(parameterUtil, 'getParametersJson').mockResolvedValue(testParametersJson);
    vi.spyOn(localSettingsUtil, 'getLocalSettingsJson').mockResolvedValue(testLocalSettings as any);
    vi.spyOn(parameterizerUtil, 'areAllConnectionsParameterized').mockReturnValue(false);
    vi.spyOn(parameterizerUtil, 'parameterizeConnection').mockImplementation((connection, key) => {
      return { ...connection, parameterized: true, key };
    });
    vi.spyOn(parameterUtil, 'saveWorkflowParameter').mockResolvedValue();
    vi.spyOn(connectionUtil, 'saveConnectionReferences').mockResolvedValue();

    vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(localizeUtil, 'localize' as any).mockImplementation((key: string, defaultValue: string, ..._params: any[]) => defaultValue);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing if no workspace folders are available', async () => {
    (vscode.workspace as any).workspaceFolders = undefined;
    const getWorkspaceLogicAppFoldersSpy = vi.spyOn(workspaceUtil, 'getWorkspaceLogicAppFolders');
    await parameterizeConnections(testContext, testLogicAppProjectPath1);
    expect(getWorkspaceLogicAppFoldersSpy).not.toHaveBeenCalled();
  });

  it('should return early if connectionsJson is empty', async () => {
    vi.spyOn(connectionUtil, 'getConnectionsJson').mockResolvedValue('');
    await parameterizeConnections(testContext, testLogicAppProjectPath1);
    expect(connectionUtil.getConnectionsJson).toHaveBeenCalledWith(testLogicAppProjectPath1);
    expect(parameterUtil.saveWorkflowParameter).not.toHaveBeenCalled();
    expect(connectionUtil.saveConnectionReferences).not.toHaveBeenCalled();
  });

  it('should notify if all connections are already parameterized', async () => {
    vi.spyOn(parameterizerUtil, 'areAllConnectionsParameterized').mockReturnValue(true);
    await parameterizeConnections(testContext, testLogicAppProjectPath1);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      localizeUtil.localize('connectionsAlreadyParameterized', 'Connections are already parameterized.')
    );
    expect(parameterUtil.saveWorkflowParameter).not.toHaveBeenCalled();
  });

  it('should parameterize connections and save workflow parameters and connection references', async () => {
    await parameterizeConnections(testContext, testLogicAppProjectPath1);
    expect(connectionUtil.getConnectionsJson).toHaveBeenCalledWith(testLogicAppProjectPath1);
    expect(parameterUtil.getParametersJson).toHaveBeenCalledWith(testLogicAppProjectPath1);
    expect(localSettingsUtil.getLocalSettingsJson).toHaveBeenCalledWith(
      testContext,
      path.join(testLogicAppProjectPath1, 'local.settings.json')
    );
    expect(parameterizerUtil.parameterizeConnection).toHaveBeenCalled();
    expect(parameterUtil.saveWorkflowParameter).toHaveBeenCalledWith(testContext, testLogicAppProjectPath1, testParametersJson);
    expect(connectionUtil.saveConnectionReferences).toHaveBeenCalledOnce();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      localizeUtil.localize('finishedParameterizingConnections', 'Successfully parameterized connections.')
    );
  });

  it('should parameterize connections for all logic apps in the workspace when no project path is provided', async () => {
    const paramSpy = vi.spyOn(parameterizerUtil, 'areAllConnectionsParameterized').mockReturnValue(false);
    await parameterizeConnections(testContext);
    expect(workspaceUtil.getWorkspaceLogicAppFolders).toHaveBeenCalled();
    expect(connectionUtil.getConnectionsJson).toHaveBeenCalledTimes(2);
    expect(connectionUtil.getConnectionsJson).toHaveBeenCalledWith(testLogicAppProjectPath1);
    expect(connectionUtil.getConnectionsJson).toHaveBeenCalledWith(testLogicAppProjectPath2);
    expect(paramSpy).toHaveBeenCalledTimes(2);
    expect(connectionUtil.saveConnectionReferences).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and log them', async () => {
    const error = new Error('Test error');
    vi.spyOn(connectionUtil, 'getConnectionsJson').mockRejectedValue(error);

    await expect(parameterizeConnections(testContext, testLogicAppProjectPath1)).rejects.toThrow();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledOnce();
  });
});
