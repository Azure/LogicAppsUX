import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { workflowSubscriptionIdKey } from '../../../../constants';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { createAzureWizard } from '../azureConnectorWizard';
import { getLogicAppProjectRoot, getParentLogicAppRoot } from '../../../utils/workspace';
import { getAzureConnectorDetailsForLocalProject, invalidateAzureDetailsCache } from '../azureConnectorDetails';
import { clearConnectorSetupSkipped } from '../../../state/connectors';
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

vi.mock('../../../utils/workspace', () => ({
  getLogicAppProjectRoot: vi.fn(),
  getParentLogicAppRoot: vi.fn(),
}));

vi.mock('../azureConnectorWizard', () => ({
  createAzureWizard: vi.fn(),
}));

vi.mock('../azureConnectorDetails', () => ({
  getAzureConnectorDetailsForLocalProject: vi.fn(),
  invalidateAzureDetailsCache: vi.fn(),
}));

vi.mock('../../../state/connectors', () => ({
  clearConnectorSetupSkipped: vi.fn(),
}));

describe('enableAzureConnectors', () => {
  const projectPath = path.join('/workspace', 'LogicApp');
  const workflowFilePath = path.join('/workspace', 'LogicApp', 'workflow.json');
  let context: any;

  beforeEach(() => {
    vi.clearAllMocks();
    context = { telemetry: { properties: {}, measurements: {} } };
    (getParentLogicAppRoot as Mock).mockResolvedValue(projectPath);
    (getLogicAppProjectRoot as Mock).mockResolvedValue(projectPath);
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

    expect(getParentLogicAppRoot).toHaveBeenCalledWith(workflowFilePath);
    expect(getLocalSettingsJson).toHaveBeenCalledWith(context, projectPath);
    expect(createAzureWizard).toHaveBeenCalledWith(context, projectPath);
    expect(prompt).toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
    expect(invalidateAzureDetailsCache).toHaveBeenCalledWith(projectPath);
    expect(clearConnectorSetupSkipped).toHaveBeenCalledWith(projectPath);
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

    expect(getLogicAppProjectRoot).toHaveBeenCalledWith(context);
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Azure connectors are enabled for the workflow.');
  });
});
