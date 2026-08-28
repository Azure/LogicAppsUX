import * as fse from 'fs-extra';
import * as path from 'path';
import { Uri } from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectionsFileName,
  customDirectory,
  funcVersionSetting,
  libDirectory,
  parametersFileName,
  projectLanguageSetting,
} from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { getConnectionsJson } from '../../../utils/codeless/connection';
import { getParametersJson } from '../../../utils/codeless/parameter';
import { writeFormattedJson } from '../../../utils/fs';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { uploadAppSettings } from '../../appSettings/uploadAppSettings';
import { tryBuildCustomCodeFunctionsProjectInternal } from '../../buildCustomCodeFunctionsProject';
import { publishCodefulProject } from '../../publishCodefulProject';
import { deployProductionSlot } from '../deploy';
import { notifyDeployComplete } from '../notifyDeployComplete';
import { deploy as innerDeploy, getDeployFsPath, getDeployNode } from '@microsoft/vscode-azext-azureappservice';
import { resolveConnectionsReferences } from '@microsoft/logic-apps-shared';
import { hasCodefulWorkflowSetting } from '../../../utils/codeful';
import { getLogicAppProjectRoot, resolveUri } from '../../../utils/workspace';

vi.mock('vscode', () => {
  class MockUri {
    public static file(fsPath: string): MockUri {
      return new MockUri('file', '', fsPath);
    }

    constructor(
      public scheme: string,
      public authority: string,
      public fsPath: string
    ) {}

    public get path(): string {
      return this.fsPath;
    }

    public toString(): string {
      return this.fsPath;
    }
  }

  return { Uri: MockUri };
});

vi.mock('fs-extra', () => ({
  copy: vi.fn(),
  emptyDir: vi.fn(),
  mkdirSync: vi.fn(),
  move: vi.fn(),
  pathExists: vi.fn(),
  rmdirSync: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
    rgApi: {
      appResourceTree: {},
    },
  },
}));

vi.mock('../../../../LogicAppResolver', () => ({
  LogicAppResolver: class {},
}));

vi.mock('../../../tree/LogicAppResourceTree', () => ({
  LogicAppResourceTree: class {},
}));

vi.mock('../../../tree/slotsTree/SlotTreeItem', () => ({
  SlotTreeItem: class {},
}));

vi.mock('../../../tree/subscriptionTree/subscriptionTreeItem', () => ({
  SubscriptionTreeItem: {
    contextValue: 'subscription',
  },
}));

vi.mock('../../../utils/codeless/connection', () => ({
  createAclInConnectionIfNeeded: vi.fn(),
  getConnectionsJson: vi.fn(),
}));

vi.mock('../../../utils/codeless/parameter', () => ({
  getParametersJson: vi.fn(),
}));

vi.mock('../../../utils/fs', () => ({
  isPathEqual: vi.fn(),
  writeFormattedJson: vi.fn(),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  addLocalFuncTelemetry: vi.fn(),
  tryParseFuncVersion: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
  shouldParameterizeConnections: vi.fn(() => false),
}));

vi.mock('../../createLogicApp/createLogicApp', () => ({
  createLogicApp: vi.fn(),
  createLogicAppAdvanced: vi.fn(),
}));

vi.mock('../../createLogicApp/createLogicAppSteps/advancedIdentityPromptSteps', () => ({
  AdvancedIdentityClientIdStep: class {},
  AdvancedIdentityClientSecretStep: class {},
  AdvancedIdentityObjectIdStep: class {},
  AdvancedIdentityTenantIdStep: class {},
}));

vi.mock('../notifyDeployComplete', () => ({
  notifyDeployComplete: vi.fn(),
}));

vi.mock('../updateAppSettings', () => ({
  updateAppSettingsWithIdentityDetails: vi.fn(),
}));

vi.mock('../verifyAppSettings', () => ({
  verifyAppSettings: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureappservice', () => ({
  deploy: vi.fn(),
  getDeployFsPath: vi.fn(),
  getDeployNode: vi.fn(),
  runPreDeployTask: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureappservice/out/src/ScmType', () => ({
  ScmType: {
    GitHub: 'GitHub',
    LocalGit: 'LocalGit',
  },
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizard: class {},
  callWithTelemetryAndErrorHandling: vi.fn(
    async (_eventName: string, callback: (context: { errorHandling: Record<string, unknown> }) => Promise<unknown>) =>
      callback({ errorHandling: {} })
  ),
  DialogResponses: {
    cancel: { title: 'Cancel' },
    yes: { title: 'Yes' },
  },
  nonNullOrEmptyValue: vi.fn((value: unknown) => value),
}));

vi.mock('../hybridLogicApp', () => ({
  deployHybridLogicApp: vi.fn(),
  zipDeployHybridLogicApp: vi.fn(),
}));

vi.mock('../../../utils/azureClients', () => ({
  createContainerClient: vi.fn(),
}));

vi.mock('../../appSettings/uploadAppSettings', () => ({
  uploadAppSettings: vi.fn(),
}));

vi.mock('../../../utils/tree/slotTreeUtils', () => ({
  getAppSettingsFromNode: vi.fn(() => ({ id: 'app-settings-node' })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  resolveConnectionsReferences: vi.fn(),
}));

vi.mock('../../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProjectInternal: vi.fn(),
}));

vi.mock('../../../utils/codeful', () => ({
  hasCodefulWorkflowSetting: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getLogicAppProjectRoot: vi.fn(),
  resolveUri: vi.fn(),
}));

vi.mock('../../../projectConsistency/vscodeConsistency', () => ({
  isProjectInitializedForVSCode: vi.fn(() => true),
}));

vi.mock('../../initProjectForVSCode/initProjectForVSCode', () => ({
  initProjectForVSCode: vi.fn(),
}));

vi.mock('../../publishCodefulProject', () => ({
  publishCodefulProject: vi.fn(),
}));

describe('deployProductionSlot nested projects', () => {
  const workspacePath = path.join('workspace-root');
  const nestedProjectPath = path.join(workspacePath, 'nested-logic-app');
  const deployPayloadPath = path.join(nestedProjectPath, 'dist');
  const deployTempPath = path.join(path.dirname(nestedProjectPath), `${path.basename(nestedProjectPath)}-deploytemp`);
  const projectTarget = Uri.file(nestedProjectPath);

  let context: any;
  let node: any;
  let siteClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    context = {
      errorHandling: {},
      telemetry: { properties: {}, measurements: {} },
      ui: {
        showWarningMessage: vi.fn(),
      },
    };
    siteClient = {
      fullName: 'nested-logic-app',
      getSiteConfig: vi.fn().mockResolvedValue({ scmType: 'ZipDeploy' }),
    };
    node = {
      getApplicationSettings: vi.fn().mockResolvedValue({}),
      isHybridLogicApp: false,
      loadAllChildren: vi.fn(),
      runWithTemporaryDescription: vi.fn(async (_context, _description, callback) => callback()),
      site: {
        createClient: vi.fn().mockResolvedValue(siteClient),
        isSlot: false,
        kind: 'functionapp,workflowapp',
      },
    };

    vi.mocked(getDeployFsPath).mockResolvedValue({
      effectiveDeployFsPath: deployPayloadPath,
      originalDeployFsPath: nestedProjectPath,
    } as any);
    vi.mocked(getLogicAppProjectRoot).mockResolvedValue(nestedProjectPath);
    vi.mocked(resolveUri).mockImplementation((fsPath) => (fsPath ? Uri.file(fsPath) : undefined));
    vi.mocked(getDeployNode).mockResolvedValue(node);
    vi.mocked(hasCodefulWorkflowSetting).mockResolvedValue(false);
    vi.mocked(tryBuildCustomCodeFunctionsProjectInternal).mockResolvedValue(true);
    vi.mocked(fse.pathExists).mockResolvedValue(false);
    vi.mocked(getConnectionsJson).mockResolvedValue('{}');
    vi.mocked(getParametersJson).mockResolvedValue({});
    vi.mocked(resolveConnectionsReferences).mockReturnValue({} as any);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      if (key === projectLanguageSetting) {
        return 'JavaScript';
      }
      if (key === funcVersionSetting) {
        return '~4';
      }
      return undefined;
    });

    const { tryParseFuncVersion } = await import('../../../utils/funcCoreTools/funcVersion');
    vi.mocked(tryParseFuncVersion).mockReturnValue('~4' as any);
  });

  it('uses the nested project for codeful detection, publishing, metadata, and app settings', async () => {
    vi.mocked(hasCodefulWorkflowSetting).mockResolvedValue(true);

    await deployProductionSlot(context, projectTarget);

    expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(getDeployFsPath).toHaveBeenCalledWith(context, expect.objectContaining({ fsPath: nestedProjectPath }));
    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(nestedProjectPath);
    expect(publishCodefulProject).toHaveBeenCalledWith(expect.anything(), nestedProjectPath);
    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
    expect(getWorkspaceSetting).toHaveBeenCalledWith(projectLanguageSetting, nestedProjectPath);
    expect(getWorkspaceSetting).toHaveBeenCalledWith(funcVersionSetting, nestedProjectPath);
    expect(getConnectionsJson).toHaveBeenCalledWith(nestedProjectPath);
    expect(getParametersJson).toHaveBeenCalledWith(nestedProjectPath);
    expect(uploadAppSettings).toHaveBeenCalledWith(expect.anything(), { id: 'app-settings-node' }, nestedProjectPath, expect.any(Array));
    expect(ext.deploymentFolderPath).toBe(nestedProjectPath);
  });

  it('builds custom code from the nested project and creates its managed-connection payload beside that project', async () => {
    const customCodePath = path.join(nestedProjectPath, libDirectory, customDirectory);
    const connectionsData = {
      managedApiConnections: {
        office365: {
          connection: { id: '/subscriptions/test/connections/office365' },
        },
      },
    };
    vi.mocked(fse.pathExists).mockImplementation(async (candidatePath) => candidatePath === customCodePath);
    vi.mocked(getConnectionsJson).mockResolvedValue(JSON.stringify(connectionsData));
    vi.mocked(resolveConnectionsReferences).mockReturnValue({
      managedApiConnections: {
        office365: {
          connection: { id: '/subscriptions/test/connections/office365' },
        },
      },
    } as any);

    await deployProductionSlot(context, projectTarget);

    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(nestedProjectPath);
    expect(fse.pathExists).toHaveBeenCalledWith(customCodePath);
    expect(tryBuildCustomCodeFunctionsProjectInternal).toHaveBeenCalledWith(expect.anything(), nestedProjectPath);
    expect(getConnectionsJson).toHaveBeenCalledWith(nestedProjectPath);
    expect(getParametersJson).toHaveBeenCalledWith(nestedProjectPath);
    expect(fse.mkdirSync).toHaveBeenCalledWith(deployTempPath);
    expect(fse.copy).toHaveBeenCalledWith(deployPayloadPath, deployTempPath, { overwrite: true });
    expect(writeFormattedJson).toHaveBeenCalledWith(path.join(deployTempPath, connectionsFileName), expect.any(Object));
    expect(writeFormattedJson).toHaveBeenCalledWith(path.join(deployTempPath, parametersFileName), expect.any(Object));
    expect(innerDeploy).toHaveBeenCalledWith(node.site, deployTempPath, expect.anything());
    expect(uploadAppSettings).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'app-settings-node' },
      nestedProjectPath,
      expect.arrayContaining(['office365-connectionKey'])
    );
    expect(notifyDeployComplete).toHaveBeenCalledWith(node, false);
    expect(fse.mkdirSync).not.toHaveBeenCalledWith(path.join(path.dirname(workspacePath), `${path.basename(workspacePath)}-deploytemp`));
  });

  it('selects a Logic App project before resolving deploy paths when no local target is supplied', async () => {
    await deployProductionSlot(context);

    expect(getLogicAppProjectRoot).toHaveBeenCalledWith(context);
    expect(getDeployFsPath).toHaveBeenCalledWith(context, expect.objectContaining({ fsPath: nestedProjectPath }));
  });

  it('preserves the workspace URI scheme when selecting a project in a remote workspace', async () => {
    vi.mocked(resolveUri).mockReturnValue({
      authority: 'ssh-remote+host',
      fsPath: nestedProjectPath,
      path: nestedProjectPath,
      scheme: 'vscode-remote',
    } as Uri);

    await deployProductionSlot(context);

    expect(getDeployFsPath).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        authority: 'ssh-remote+host',
        fsPath: nestedProjectPath,
        scheme: 'vscode-remote',
      })
    );
  });
});
