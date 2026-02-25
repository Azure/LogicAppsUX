import {
  appKindSetting,
  artifactsDirectory,
  assetsFolderName,
  autoRuntimeDependenciesPathSettingKey,
  azureWebJobsFeatureFlagsKey,
  azureWebJobsStorageKey,
  defaultVersionRange,
  devContainerFolderName,
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
  lspDirectory,
  multiLanguageWorkerSetting,
  ProjectDirectoryPathKey,
  rulesDirectory,
  schemasDirectory,
  testsDirectoryName,
  vscodeFolderName,
  workerRuntimeKey,
  workflowCodefulEnabled,
  workflowFileName,
  workspaceTemplatesFolderName,
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
import { WorkerRuntime, ProjectType, WorkflowType } from '@microsoft/vscode-extension-logic-apps';
import { createDevContainerContents, createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';
import { logicAppPackageProcessing, unzipLogicAppPackageIntoWorkspace } from '../../../utils/cloudToLocalUtils';
import { isLogicAppProject } from '../../../utils/verifyIsProject';
import { getGlobalSetting } from '../../../utils/vsCodeConfig/settings';

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

export async function createLogicAppAndWorkflow(webviewProjectContext: IWebviewProjectContext, logicAppFolderPath: string) {
  const { logicAppType, workflowType, functionName, workflowName, logicAppName } = webviewProjectContext;

  await fse.ensureDir(logicAppFolderPath);
  if (logicAppType === ProjectType.agentCodeful) {
    await createAgentCodefulWorkflowFile(logicAppFolderPath, logicAppName, workflowName, workflowType);
  } else {
    const codelessDefinition: StandardApp = getCodelessWorkflowTemplate(logicAppType as ProjectType, workflowType, functionName);
    const logicAppWorkflowFolderPath = path.join(logicAppFolderPath, workflowName);
    await fse.ensureDir(logicAppWorkflowFolderPath);

    const workflowJsonFullPath: string = path.join(logicAppWorkflowFolderPath, workflowFileName);
    await writeFormattedJson(workflowJsonFullPath, codelessDefinition);
  }
}

const createAgentCodefulWorkflowFile = async (
  logicAppFolderPath: string,
  logicAppName: string,
  workflowName: string,
  workflowType: WorkflowType
) => {
  const agentFileName = workflowType === WorkflowType.statefulCodeful ? 'StatefulCodefulFile' : 'AgentCodefulFile';
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const lspDirectoryPath = path.join(targetDirectory, lspDirectory);

  // Create the .cs file inside the functions folder
  const templateCSPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', agentFileName);
  const templateCSContent = (await fse.readFile(templateCSPath, 'utf-8')).replace(/<%= flowName %>/g, `"${workflowName}"`);

  const csFilePath = path.join(logicAppFolderPath, 'Program.cs');
  await fse.writeFile(csFilePath, templateCSContent);

  // Create the .csproj file inside the functions folder
  const templateProjPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', 'CodefulProj');
  const templateProjContent = await fse.readFile(templateProjPath, 'utf-8');

  const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);

  await fse.writeFile(csprojFilePath, templateProjContent);

  // Create nuget.config file
  // Create the .cs file inside the functions folder
  const templateNugetPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', 'nuget');
  const templateNugetContent = (await fse.readFile(templateNugetPath, 'utf-8')).replace(/<%= lspDirectory %>/g, `"${lspDirectoryPath}"`);

  const nugetFilePath = path.join(logicAppFolderPath, 'nuget.config');
  await fse.writeFile(nugetFilePath, templateNugetContent);
};

export async function createLocalConfigurationFiles(
  webviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string
): Promise<void> {
  const { logicAppType } = webviewProjectContext;
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

  if (logicAppType !== ProjectType.logicApp) {
    funcignore.push('global.json');
    localSettingsJson.Values[azureWebJobsFeatureFlagsKey] = multiLanguageWorkerSetting;
  }

  if (logicAppType === ProjectType.agentCodeful) {
    localSettingsJson.Values[workflowCodefulEnabled] = 'true';
    localSettingsJson.Values['AzureFunctionsJobHost__extensionBundle__id'] = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
    localSettingsJson.Values['AzureFunctionsJobHost__extensionBundle__version'] = '[1.141.0.12]';
    localSettingsJson.Values['FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI'] = 'https://cdnforlogicappsv2.blob.core.windows.net/apseth-test';
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

export async function createWorkspaceStructure(webviewProjectContext: IWebviewProjectContext): Promise<void> {
  const { workspaceProjectPath, workspaceName, logicAppName, functionFolderName, logicAppType } = webviewProjectContext;

  //Create the workspace folder
  const workspaceFolder = path.join(workspaceProjectPath.fsPath, workspaceName);
  await fse.ensureDir(workspaceFolder);

  // Create the workspace .code-workspace file
  const workspaceFilePath = path.join(workspaceFolder, `${workspaceName}.code-workspace`);
  const workspaceFolders = [];
  workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

  // push functions folder
  if (logicAppType !== ProjectType.logicApp && logicAppType !== ProjectType.agentCodeful) {
    workspaceFolders.push({ name: functionFolderName, path: `./${functionFolderName}` });
  }

  // Add .devcontainer folder for devcontainer projects
  if (webviewProjectContext.isDevContainerProject) {
    workspaceFolders.push({ name: devContainerFolderName, path: devContainerFolderName });
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
export async function updateWorkspaceFile(context: IWebviewProjectContext) {
  const { workspaceFilePath, logicAppName = 'LogicApp', shouldCreateLogicAppProject, logicAppType, functionFolderName } = context;
  const workspaceContent = await fse.readJson(workspaceFilePath);
  const workspaceFolders = [];

  if (shouldCreateLogicAppProject) {
    workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });
  }

  if (logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine) {
    workspaceFolders.push({ name: functionFolderName, path: `./${functionFolderName}` });
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

  const webviewProjectContext: IWebviewProjectContext = options;

  await createWorkspaceStructure(webviewProjectContext);

  // Create the workspace folder
  const workspaceFolder = path.join(webviewProjectContext.workspaceProjectPath.fsPath, webviewProjectContext.workspaceName);
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, webviewProjectContext.logicAppName);
  const workspaceFilePath = path.join(workspaceFolder, `${webviewProjectContext.workspaceName}.code-workspace`);

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = webviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (fromPackage) {
    mySubContext.packagePath = options.packagePath.fsPath;
    await unzipLogicAppPackageIntoWorkspace(mySubContext);
  } else {
    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath);
  }

  // .vscode folder
  await createLogicAppVsCodeContents(webviewProjectContext, logicAppFolderPath);

  await createDevContainerContents(webviewProjectContext, workspaceFolder);

  await createLocalConfigurationFiles(webviewProjectContext, logicAppFolderPath);

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
    if (webviewProjectContext.logicAppType === ProjectType.customCode || webviewProjectContext.logicAppType === ProjectType.rulesEngine) {
      const createFunctionAppFilesStep = new CreateFunctionAppFiles();
      await createFunctionAppFilesStep.setup(mySubContext);
    }
    vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
  }

  await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(workspaceFilePath), true /* forceNewWindow */);
}

export async function createLogicAppProject(context: IActionContext, options: any, workspaceRootFolder: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const webviewProjectContext: IWebviewProjectContext = options;
  // Create the workspace folder
  const workspaceFolder = workspaceRootFolder;
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, webviewProjectContext.logicAppName);

  // Check if the logic app directory already exists
  const logicAppExists = await fse.pathExists(logicAppFolderPath);
  let doesLogicAppExist = false;
  if (logicAppExists) {
    // Check if it's actually a Logic App project
    doesLogicAppExist = await isLogicAppProject(logicAppFolderPath);
  }

  // Check if we're in a workspace and get the workspace folder
  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    const workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
    webviewProjectContext.workspaceFilePath = workspaceFilePath;
    webviewProjectContext.shouldCreateLogicAppProject = !doesLogicAppExist;
    // need to get logic app in projects
    await updateWorkspaceFile(webviewProjectContext);
  } else {
    // Fall back to the newly created workspace folder if not in a workspace
    vscode.window.showErrorMessage(
      localize('notInWorkspace', 'Please open an existing logic app workspace before trying to add a new logic app project.')
    );
    return;
  }

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = webviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (!doesLogicAppExist) {
    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath);

    // .vscode folder
    await createLogicAppVsCodeContents(webviewProjectContext, logicAppFolderPath);

    await createLocalConfigurationFiles(webviewProjectContext, logicAppFolderPath);

    if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
      await gitInit(workspaceFolder);
    }

    await createArtifactsFolder(mySubContext);
    await createRulesFiles(mySubContext);
    await createLibFolder(mySubContext);
  }

  if (webviewProjectContext.logicAppType !== ProjectType.logicApp) {
    const createFunctionAppFilesStep = new CreateFunctionAppFiles();
    await createFunctionAppFilesStep.setup(mySubContext);
  }
  vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
