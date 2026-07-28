import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { workflowSubscriptionIdKey } from '../../../../constants';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getAzureConnectorDetailsForLocalProject, invalidateAzureDetailsCache } from '../../../utils/codeless/common';
import { getLogicAppProjectRoot } from '../../../utils/codeless/connection';
import { getWorkspaceFolder } from '../../../utils/workspace';
import { createAzureWizard } from '../azureConnectorWizard';
import { enableAzureConnectors } from '../enableAzureConnectors';
import { ext } from '../../../../extensionVariables';
import path from 'path';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn(),
}));

vi.mock('../../../utils/codeless/connection', () => ({
  getLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../../utils/codeless/common', () => ({
  getAzureConnectorDetailsForLocalProject: vi.fn(),
  invalidateAzureDetailsCache: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getWorkspaceFolder: vi.fn(),
}));

vi.mock('../azureConnectorWizard', () => ({
  createAzureWizard: vi.fn(),
}));

describe('enableAzureConnectors', () => {
  const projectPath = path.join('/workspace', 'LogicApp');
  const workflowFilePath = path.join('/workspace', 'LogicApp', 'workflow.json');
  let context: any;

  beforeEach(() => {
    vi.clearAllMocks();
    context = { telemetry: { properties: {}, measurements: {} } };
    (getLogicAppProjectRoot as Mock).mockResolvedValue(projectPath);
    (getWorkspaceFolder as Mock).mockResolvedValue({ uri: { fsPath: projectPath } });
    (getAzureConnectorDetailsForLocalProject as Mock).mockResolvedValue({});
  });

  it('runs the Azure connector wizard when local settings are missing connector values', async () => {
    const prompt = vi.fn(async () => {
      context.enabled = true;
    });
    const execute = vi.fn();
    (getLocalSettingsJson as Mock).mockResolvedValue({ Values: {} });
    (createAzureWizard as Mock).mockReturnValue({ prompt, execute });

    await enableAzureConnectors(context, { fsPath: workflowFilePath } as vscode.Uri);

    expect(getLogicAppProjectRoot).toHaveBeenCalledWith(context, workflowFilePath);
    expect(getLocalSettingsJson).toHaveBeenCalledWith(context, projectPath);
    expect(createAzureWizard).toHaveBeenCalledWith(context, projectPath);
    expect(prompt).toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
    expect(invalidateAzureDetailsCache).toHaveBeenCalledWith(projectPath);
    expect(getAzureConnectorDetailsForLocalProject).toHaveBeenCalledWith(context, projectPath);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Azure connectors are enabled for the workflow.');
  });

  it('shows already-enabled information when subscription setting exists', async () => {
    (getLocalSettingsJson as Mock).mockResolvedValue({
      Values: {
        [workflowSubscriptionIdKey]: 'subscription-id',
      },
    });

    await enableAzureConnectors(context, undefined);

    expect(getWorkspaceFolder).toHaveBeenCalledWith(context);
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Azure connectors are enabled for the workflow.');
  });
});
