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
  testsDirectoryName,
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
import { getCombinedWorkflowTemplate } from '../../../utils/codeless/templates';
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
import { isLogicAppProject } from '../../../utils/verifyIsProject';
import { commands, Uri } from 'vscode';

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

export async function createLogicAppAndWorkflow(
  myWebviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string
): Promise<void> {
  const codelessDefinition: StandardApp = getCombinedWorkflowTemplate(
    myWebviewProjectContext.functionName,
    myWebviewProjectContext.workflowType as WorkflowType,
    myWebviewProjectContext.logicAppType
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

export async function createWorkspaceFile(context: IActionContext, options: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const myWebviewProjectContext: IWebviewProjectContext = options;

  const workspaceFolderPath = path.join(myWebviewProjectContext.workspaceProjectPath.fsPath, myWebviewProjectContext.workspaceName);

  await fse.ensureDir(workspaceFolderPath);
  const workspaceFilePath = path.join(workspaceFolderPath, `${myWebviewProjectContext.workspaceName}.code-workspace`);

  // Start with an empty folders array
  const workspaceFolders = [];
  const foldersToAdd = vscode.workspace.workspaceFolders;

  if (foldersToAdd && foldersToAdd.length === 1) {
    const folder = foldersToAdd[0];
    const folderPath = folder.uri.fsPath;
    if (await isLogicAppProject(folderPath)) {
      const destinationPath = path.join(workspaceFolderPath, folder.name);
      await fse.copy(folderPath, destinationPath);
      workspaceFolders.push({ name: folder.name, path: `./${folder.name}` });
    } else {
      const subpaths: string[] = await fse.readdir(folderPath);
      for (const subpath of subpaths) {
        const fullPath = path.join(folderPath, subpath);
        const destinationPath = path.join(workspaceFolderPath, subpath);
        await fse.copy(fullPath, destinationPath);
        workspaceFolders.push({ name: subpath, path: `./${subpath}` });
      }
    }
  }

  const workspaceData = {
    folders: workspaceFolders,
  };

  await fse.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });

  const uri = Uri.file(workspaceFilePath);

  await commands.executeCommand(extensionCommand.vscodeOpenFolder, uri, true /* forceNewWindow */);
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
    const functionsFolder = context.functionName;
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

export async function createLogicAppProject(context: IActionContext, options: any, workspaceRootFolder: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const myWebviewProjectContext: IWebviewProjectContext = options;
  // Create the workspace folder
  const workspaceFolder = workspaceRootFolder;
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, myWebviewProjectContext.logicAppName);

  // Check if the logic app directory already exists
  const logicAppExists = await fse.pathExists(logicAppFolderPath);
  let doesLogicAppExist = false;
  if (logicAppExists) {
    // Check if it's actually a Logic App project
    doesLogicAppExist = await isLogicAppProject(logicAppFolderPath);
  }

  //   await createWorkspaceStructure(myWebviewProjectContext);
  // Check if we're in a workspace and get the workspace folder
  //   let workspaceRootFolder: string;
  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    const workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
    myWebviewProjectContext.workspaceFilePath = workspaceFilePath;
    myWebviewProjectContext.shouldCreateLogicAppProject = !doesLogicAppExist;
    // need to get logic app in projects
    await updateWorkspaceFile(myWebviewProjectContext);
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
  mySubContext.projectType = myWebviewProjectContext.logicAppType as ProjectType;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionWorkspace;
  mySubContext.targetFramework = options.targetFramework;
  mySubContext.workspacePath = workspaceFolder;

  if (!doesLogicAppExist) {
    await createLogicAppAndWorkflow(myWebviewProjectContext, logicAppFolderPath);

    // .vscode folder
    await createLogicAppVsCodeContents(myWebviewProjectContext, logicAppFolderPath);

    await createLocalConfigurationFiles(myWebviewProjectContext, logicAppFolderPath);

    if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
      await gitInit(workspaceFolder);
    }

    await createArtifactsFolder(mySubContext);
    await createRulesFiles(mySubContext);
    await createLibFolder(mySubContext);
  }

  if (myWebviewProjectContext.logicAppType !== ProjectType.logicApp) {
    const createFunctionAppFilesStep = new CreateFunctionAppFiles();
    await createFunctionAppFilesStep.setup(mySubContext);
  }
  vscode.window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
