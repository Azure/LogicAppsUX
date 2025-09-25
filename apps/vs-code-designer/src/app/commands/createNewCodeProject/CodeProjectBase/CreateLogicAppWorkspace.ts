import {
  appKindSetting,
  azureWebJobsFeatureFlagsKey,
  azureWebJobsStorageKey,
  defaultVersionRange,
  extensionBundleId,
  extensionCommand,
  funcIgnoreFileName,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  gitignoreFileName,
  hostFileName,
  localEmulatorConnectionString,
  localSettingsFileName,
  logicAppKind,
  multiLanguageWorkerSetting,
  ProjectDirectoryPathKey,
  vscodeFolderName,
  workerRuntimeKey,
  workflowFileName,
  type WorkflowType,
} from '../../../../constants';
import { localize } from '../../../../localize';
import { createArtifactsFolder } from '../../../utils/codeless/artifacts';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { newGetGitIgnoreContent, gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
import { writeFormattedJson } from '../../../utils/fs';
import { getCodelessWorkflowTemplate } from '../../../utils/codeless/templates';
import { CreateFunctionAppFiles } from './CreateFunctionAppFiles';
import type {
  IFunctionWizardContext,
  IHostJsonV2,
  ILocalSettingsJson,
  IWebviewProjectContext,
  StandardApp,
} from '@microsoft/vscode-extension-logic-apps';
import { WorkerRuntime, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';

export async function createRulesFiles(context: IFunctionWizardContext): Promise<void> {
  if (context.projectType === ProjectType.rulesEngine) {
    // SampleRuleSet.xml
    const sampleRuleSetPath = path.join(__dirname, 'assets', 'RuleSetProjectTemplate', 'SampleRuleSet');
    const sampleRuleSetXMLPath = path.join(context.projectPath, 'Artifacts', 'Rules', 'SampleRuleSet.xml');
    const sampleRuleSetXMLContent = await fse.readFile(sampleRuleSetPath, 'utf-8');
    const sampleRuleSetXMLFileContent = sampleRuleSetXMLContent.replace(/<%= methodName %>/g, context.functionAppName);
    await fse.writeFile(sampleRuleSetXMLPath, sampleRuleSetXMLFileContent);

    // SchemaUser.xsd
    const schemaUserPath = path.join(__dirname, 'assets', 'RuleSetProjectTemplate', 'SchemaUser');
    const schemaUserXSDPath = path.join(context.projectPath, 'Artifacts', 'Schemas', 'SchemaUser.xsd');
    const schemaUserXSDContent = await fse.readFile(schemaUserPath, 'utf-8');
    await fse.writeFile(schemaUserXSDPath, schemaUserXSDContent);
  }
}

export async function createLibFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });
}

export async function getHostContent(): Promise<IHostJsonV2> {
  const hostJson: IHostJsonV2 = {
    version: '2.0',
    logging: {
      applicationInsights: {
        samplingSettings: {
          isEnabled: true,
          excludedTypes: 'Request',
        },
      },
    },
    extensionBundle: {
      id: extensionBundleId,
      version: defaultVersionRange,
    },
  };
  return hostJson;
}

export async function createWorkflow(myWebviewProjectContext: IWebviewProjectContext, logicAppFolderPath: string): Promise<void> {
  const codelessDefinition: StandardApp = getCodelessWorkflowTemplate(
    myWebviewProjectContext.logicAppType as ProjectType,
    myWebviewProjectContext.workflowType as WorkflowType,
    myWebviewProjectContext.functionName
  );

  await fse.ensureDir(logicAppFolderPath);
  const logicAppWorkflowFolderPath = path.join(logicAppFolderPath, myWebviewProjectContext.workflowName);
  await fse.ensureDir(logicAppWorkflowFolderPath);

  const workflowJsonFullPath: string = path.join(logicAppWorkflowFolderPath, workflowFileName);
  await writeFormattedJson(workflowJsonFullPath, codelessDefinition);
}

export async function createLocalConfigurationFiles(
  myWebviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string
): Promise<void> {
  const funcignore: string[] = [
    '__blobstorage__',
    '__queuestorage__',
    '__azurite_db*__.json',
    '.git*',
    vscodeFolderName,
    localSettingsFileName,
    'test',
    '.debug',
    'workflow-designtime/',
  ];
  const localSettingsJson: ILocalSettingsJson = {
    IsEncrypted: false,
    Values: {
      [azureWebJobsStorageKey]: localEmulatorConnectionString,
      [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
      [workerRuntimeKey]: WorkerRuntime.Dotnet,
      [appKindSetting]: logicAppKind,
      [ProjectDirectoryPathKey]: logicAppFolderPath,
    },
  };
  const gitignore = '';

  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    // this.projectPath = projectPath;
    funcignore.push('global.json');
    localSettingsJson.Values[azureWebJobsFeatureFlagsKey] = multiLanguageWorkerSetting;
  }

  // const version: FuncVersion = nonNullProp(context, 'version');
  const hostJsonPath: string = path.join(logicAppFolderPath, hostFileName);
  const hostJson: IHostJsonV2 = await getHostContent();
  await writeFormattedJson(hostJsonPath, hostJson);

  const localSettingsJsonPath: string = path.join(logicAppFolderPath, localSettingsFileName);
  await writeFormattedJson(localSettingsJsonPath, localSettingsJson);

  const gitignorePath = path.join(logicAppFolderPath, gitignoreFileName);
  await fse.writeFile(gitignorePath, gitignore.concat(newGetGitIgnoreContent()));

  const funcIgnorePath: string = path.join(logicAppFolderPath, funcIgnoreFileName);
  await fse.writeFile(funcIgnorePath, funcignore.sort().join(os.EOL));
}

export async function createWorkspaceStructure(myWebviewProjectContext: IWebviewProjectContext): Promise<void> {
  //Create the workspace folder
  const workspaceFolder = path.join(myWebviewProjectContext.workspaceProjectPath.fsPath, myWebviewProjectContext.workspaceName);
  await fse.ensureDir(workspaceFolder);

  // Create the workspace .code-workspace file
  // await this.createWorkspaceFile(context);
  const workspaceFilePath = path.join(workspaceFolder, `${myWebviewProjectContext.workspaceName}.code-workspace`);
  const workspaceFolders = [];
  workspaceFolders.push({ name: myWebviewProjectContext.logicAppName, path: `./${myWebviewProjectContext.logicAppName}` });

  // push functions folder
  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    workspaceFolders.push({ name: myWebviewProjectContext.functionName, path: `./${myWebviewProjectContext.functionName}` });
  }

  const workspaceData = {
    folders: workspaceFolders,
  };
  await fse.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });
}

export async function createLogicAppWorkspace(context: IActionContext, options: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const myWebviewProjectContext: IWebviewProjectContext = options;

  await createWorkspaceStructure(myWebviewProjectContext);

  // Create the workspace folder
  const workspaceFolder = path.join(myWebviewProjectContext.workspaceProjectPath.fsPath, myWebviewProjectContext.workspaceName);
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, myWebviewProjectContext.logicAppName);
  const workspaceFilePath = path.join(workspaceFolder, `${myWebviewProjectContext.workspaceName}.code-workspace`);

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = myWebviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionWorkspace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  await createWorkflow(myWebviewProjectContext, logicAppFolderPath);

  // .vscode folder
  await createLogicAppVsCodeContents(myWebviewProjectContext, logicAppFolderPath);

  await createLocalConfigurationFiles(myWebviewProjectContext, logicAppFolderPath);

  if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
    await gitInit(workspaceFolder);
  }

  await createArtifactsFolder(mySubContext);
  await createRulesFiles(mySubContext);
  await createLibFolder(mySubContext);

  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    const createFunctionAppFilesStep = new CreateFunctionAppFiles();
    await createFunctionAppFilesStep.setup(mySubContext);
  }
  vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
  await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(workspaceFilePath), true /* forceNewWindow */);
}
