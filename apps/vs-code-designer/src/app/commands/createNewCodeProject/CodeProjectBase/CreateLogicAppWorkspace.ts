import {
  appKindSetting,
  artifactsDirectory,
  assetsFolderName,
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
  libDirectory,
  localEmulatorConnectionString,
  localSettingsFileName,
  logicAppKind,
  multiLanguageWorkerSetting,
  ProjectDirectoryPathKey,
  rulesDirectory,
  schemasDirectory,
  testsDirectoryName,
  vscodeFolderName,
  workerRuntimeKey,
  workflowFileName,
  workspaceTemplatesFolderName,
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
import { gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
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
import { createDevContainerContents, createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';
import { logicAppPackageProcessing, unzipLogicAppPackageIntoWorkspace } from '../../../utils/cloudToLocalUtils';

export async function createRulesFiles(context: IFunctionWizardContext): Promise<void> {
  if (context.projectType === ProjectType.rulesEngine) {
    // SampleRuleSet.xml
    const sampleRuleSetPath = path.join(__dirname, assetsFolderName, 'RuleSetProjectTemplate', 'SampleRuleSet');
    const sampleRuleSetXMLPath = path.join(context.projectPath, artifactsDirectory, rulesDirectory, 'SampleRuleSet.xml');
    const sampleRuleSetXMLContent = await fse.readFile(sampleRuleSetPath, 'utf-8');
    const sampleRuleSetXMLFileContent = sampleRuleSetXMLContent.replace(/<%= methodName %>/g, context.functionAppName);
    await fse.writeFile(sampleRuleSetXMLPath, sampleRuleSetXMLFileContent);

    // SchemaUser.xsd
    const schemaUserPath = path.join(__dirname, assetsFolderName, 'RuleSetProjectTemplate', 'SchemaUser');
    const schemaUserXSDPath = path.join(context.projectPath, artifactsDirectory, schemasDirectory, 'SchemaUser.xsd');
    const schemaUserXSDContent = await fse.readFile(schemaUserPath, 'utf-8');
    await fse.writeFile(schemaUserXSDPath, schemaUserXSDContent);
  }
}

export async function createLibFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, libDirectory, 'builtinOperationSdks', 'JAR'), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, libDirectory, 'builtinOperationSdks', 'net472'), { recursive: true });
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

export async function createLogicAppAndWorkflow(
  myWebviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string
): Promise<void> {
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

  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    funcignore.push('global.json');
    localSettingsJson.Values[azureWebJobsFeatureFlagsKey] = multiLanguageWorkerSetting;
  }

  const hostJsonPath: string = path.join(logicAppFolderPath, hostFileName);
  const hostJson: IHostJsonV2 = await getHostContent();
  await writeFormattedJson(hostJsonPath, hostJson);

  const localSettingsJsonPath: string = path.join(logicAppFolderPath, localSettingsFileName);
  await writeFormattedJson(localSettingsJsonPath, localSettingsJson);

  const gitignorePath = path.join(logicAppFolderPath, gitignoreFileName);
  const gitIgnoreFile = 'GitIgnoreFile';
  const templatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, gitIgnoreFile);
  await fse.copyFile(templatePath, gitignorePath);

  const funcIgnorePath: string = path.join(logicAppFolderPath, funcIgnoreFileName);
  await fse.writeFile(funcIgnorePath, funcignore.sort().join(os.EOL));
}

export async function createWorkspaceStructure(myWebviewProjectContext: IWebviewProjectContext): Promise<void> {
  //Create the workspace folder
  const workspaceFolder = path.join(myWebviewProjectContext.workspaceProjectPath.fsPath, myWebviewProjectContext.workspaceName);
  await fse.ensureDir(workspaceFolder);

  // Create the workspace .code-workspace file
  const workspaceFilePath = path.join(workspaceFolder, `${myWebviewProjectContext.workspaceName}.code-workspace`);
  const workspaceFolders = [];
  workspaceFolders.push({ name: myWebviewProjectContext.logicAppName, path: `./${myWebviewProjectContext.logicAppName}` });

  // push functions folder
  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    workspaceFolders.push({ name: myWebviewProjectContext.functionFolderName, path: `./${myWebviewProjectContext.functionFolderName}` });
  }

  const workspaceData = {
    folders: workspaceFolders,
  };
  await fse.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });
}

/**
 * Updates a .code-workspace file to group project directories in VS Code
 * @param context - Project wizard context
 */
export async function updateWorkspaceFile(context: IWebviewProjectContext): Promise<void> {
  const workspaceContent = await fse.readJson(context.workspaceFilePath);

  const workspaceFolders = [];
  const logicAppName = context.logicAppName || 'LogicApp';
  if (context.shouldCreateLogicAppProject) {
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });
  }

  if (context.logicAppType !== ProjectType.logicApp) {
    const functionsFolder = context.functionFolderName;
    workspaceFolders.push({ name: functionsFolder, path: `./${functionsFolder}` });
  }

  workspaceContent.folders = [...workspaceContent.folders, ...workspaceFolders];

  // Move the tests folder to the end of the workspace folders
  const testsIndex = workspaceContent.folders.findIndex((folder) => folder.name === testsDirectoryName);
  if (testsIndex !== -1 && testsIndex !== workspaceContent.folders.length - 1) {
    const [testsFolder] = workspaceContent.folders.splice(testsIndex, 1);
    workspaceContent.folders.push(testsFolder);
  }

  await fse.writeJSON(context.workspaceFilePath, workspaceContent, { spaces: 2 });
}

export async function createLogicAppWorkspace(context: IActionContext, options: any, fromPackage: boolean): Promise<void> {
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
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (fromPackage) {
    mySubContext.packagePath = options.packagePath.fsPath;
    await unzipLogicAppPackageIntoWorkspace(mySubContext);
  } else {
    await createLogicAppAndWorkflow(myWebviewProjectContext, logicAppFolderPath);
  }

  // .vscode folder
  await createLogicAppVsCodeContents(myWebviewProjectContext, logicAppFolderPath);

  await createDevContainerContents(myWebviewProjectContext, logicAppFolderPath);

  await createLocalConfigurationFiles(myWebviewProjectContext, logicAppFolderPath);

  if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
    await gitInit(workspaceFolder);
  }

  await createArtifactsFolder(mySubContext);
  await createRulesFiles(mySubContext);
  await createLibFolder(mySubContext);

  if (fromPackage) {
    await logicAppPackageProcessing(mySubContext);
    vscode.window.showInformationMessage(localize('finishedExtractingPackage', 'Finished extracting package into a logic app workspace.'));
  } else {
    if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
      const createFunctionAppFilesStep = new CreateFunctionAppFiles();
      await createFunctionAppFilesStep.setup(mySubContext);
    }
    vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
  }

  await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(workspaceFilePath), true /* forceNewWindow */);
}
