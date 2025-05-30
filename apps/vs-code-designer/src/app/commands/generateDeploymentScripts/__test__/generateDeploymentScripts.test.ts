import { describe, expect, beforeEach, vi, it, Mock } from 'vitest';
import * as vscode from 'vscode';
import { generateDeploymentScripts } from '../generateDeploymentScripts';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import { convertToWorkspace } from '../../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import { getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import { isLogicAppProject, tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import { COMMON_ERRORS } from '../../../../constants';

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    AzureWizardExecuteStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizardPromptStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizard: vi.fn().mockImplementation(() => ({
      prompt: vi.fn(),
      execute: vi.fn(),
    })),
    nonNullProp: vi.fn(),
    nonNullValue: vi.fn(),
    callWithTelemetryAndErrorHandling: (_key: string, callback: Function) => {
      // Simply invoke the callback with a fake telemetry context.
      return callback({ telemetry: { properties: {} } });
    },
    parseError: vi.fn(() => {
      return { message: 'error' };
    }),
    UserCancelledError: class UserCancelledError extends Error {
      constructor() {
        super(COMMON_ERRORS.OPERATION_CANCELLED);
      }
    },
    DialogResponses: vi.fn(),
    AzExtTreeItem: class AzExtTreeItem {},
    AzExtParentTreeItem: class AzExtParentTreeItem {},
  };
});

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      show: vi.fn(),
      appendLog: vi.fn(),
    },
    pinnedBundleVersion: new Map(),
    currentBundleVersion: new Map(),
  },
}));

vi.mock('../../../../localize', () => ({
  localize: vi.fn((key: string, message: string, ...args: string[]) => message.replace(/{(\d+)}/g, (_match, index) => args[index] || '')),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  addLocalFuncTelemetry: vi.fn(),
}));

vi.mock('../../createNewCodeProject/CodeProjectBase/ConvertToWorkspace', () => ({
  convertToWorkspace: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getWorkspaceFolder: vi.fn(),
  isMultiRootWorkspace: vi.fn(),
}));

vi.mock('../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
  isLogicAppProject: vi.fn(),
}));

vi.mock('../generateDeploymentScriptsSteps/DeploymentScriptTypeStep', () => ({
  DeploymentScriptTypeStep: vi.fn(),
}));

describe('generateDeploymentScripts', () => {
  let context: IActionContext;
  let node: vscode.Uri;

  beforeEach(async () => {
    context = {
      telemetry: {
        properties: {},
      },
    } as IActionContext;
    node = { fsPath: 'testPath' } as vscode.Uri;

    (ext.outputChannel.appendLog as Mock).mockClear();
    (ext.outputChannel.show as Mock).mockClear();
    (addLocalFuncTelemetry as Mock).mockClear();
    (convertToWorkspace as Mock).mockResolvedValue(true);
    (isMultiRootWorkspace as Mock).mockReturnValue(true);
    (isLogicAppProject as Mock).mockResolvedValue(true);
    (getWorkspaceFolder as Mock).mockResolvedValue({} as vscode.WorkspaceFolder);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue('projectRoot');
    (AzureWizard as Mock).mockImplementation(() => ({
      prompt: vi.fn().mockResolvedValue({}),
      execute: vi.fn().mockResolvedValue({}),
    }));
    (localize as Mock).mockClear();
  });

  it('should execute deployment script generation successfully', async () => {
    await generateDeploymentScripts(context, node);

    expect(ext.outputChannel.show).toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Starting deployment script generation...');
    expect(addLocalFuncTelemetry).toHaveBeenCalledWith(context);
    expect(convertToWorkspace).toHaveBeenCalledWith(context);
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Azure deployment scripts wizard executed successfully.');
  });

  it('should throw an error when project path is undefined', async () => {
    (isLogicAppProject as Mock).mockResolvedValue(false);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue(undefined);

    await expect(generateDeploymentScripts(context, node)).rejects.toThrow('No Logic App project found.');

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('No Logic App project found.'));
    expect(context.telemetry.properties.errorMessage).toBeDefined();
  });

  it('should handle errors during prompt steps', async () => {
    const errorMessage = 'Test prompt step error message';
    (AzureWizard as Mock).mockImplementation(() => ({
      prompt: vi.fn().mockRejectedValue(new Error(errorMessage)),
      execute: vi.fn(),
    }));

    await expect(generateDeploymentScripts(context, node)).rejects.toThrow(errorMessage);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    expect(context.telemetry.properties.errorMessage).toContain(errorMessage);
  });

  it('should handle errors during deployment script generation execute step', async () => {
    const errorMessage = 'Test execute step error message';
    (AzureWizard as Mock).mockImplementation(() => ({
      prompt: vi.fn(),
      execute: vi.fn().mockRejectedValue(new Error(errorMessage)),
    }));

    await expect(generateDeploymentScripts(context, node)).rejects.toThrow(errorMessage);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    expect(context.telemetry.properties.errorMessage).toContain(errorMessage);
  });

  it('should not throw error if operation is cancelled', async () => {
    const errorMessage = COMMON_ERRORS.OPERATION_CANCELLED;
    (AzureWizard as Mock).mockImplementation(() => {
      return {
        prompt: vi.fn(),
        execute: vi.fn().mockRejectedValue(new UserCancelledError()),
      };
    });

    await generateDeploymentScripts(context, node);

    expect(context.telemetry.properties.result).toBe('Canceled');
    expect(context.telemetry.properties.errorMessage).toBeUndefined();
  });

  it('should use workspace folder if node is undefined', async () => {
    (convertToWorkspace as Mock).mockResolvedValue(true);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue('workspaceRoot');

    await generateDeploymentScripts(context, undefined);

    expect(getWorkspaceFolder).toHaveBeenCalledWith(context);
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalled();
  });

  it('should exit early a valid workspace is not opened', async () => {
    (convertToWorkspace as Mock).mockResolvedValue(false);

    await generateDeploymentScripts(context, node);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Exiting deployment script generation...');
    expect(AzureWizard).not.toHaveBeenCalled();
  });
});
