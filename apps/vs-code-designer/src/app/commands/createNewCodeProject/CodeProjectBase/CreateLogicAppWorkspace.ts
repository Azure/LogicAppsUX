import {
  appKindSetting,
  artifactsDirectory,
  assetsFolderName,
  autoRuntimeDependenciesPathSettingKey,
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
import { ext } from '../../../../extensionVariables';
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
import { createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';
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

/**
 * Adds a workflow Build() call to an existing Program.cs file.
 */
export const addWorkflowToProgram = async (programFilePath: string, workflowName: string): Promise<void> => {
  const programContent = await fse.readFile(programFilePath, 'utf-8');

  // Find the location to insert the new workflow builder
  // Look for the "Build all workflows" comment or the CreateWorkflows() call
  const buildCallRegex = /(\s*)(\/\/ Build all workflows\s*\n(?:\s*\/\/.*\n)*\s*)(.*?)(\s*WorkflowBuilderFactory\.CreateWorkflows\(\);)/s;

  const match = programContent.match(buildCallRegex);
  if (match) {
    // Insert the new workflow builder before CreateWorkflows()
    const indent = match[1];
    const newBuildCall = `\n${indent}${workflowName}.AddWorkflow();`;
    const updatedContent = programContent.replace(buildCallRegex, `$1$2$3${newBuildCall}\n$4`);
    await fse.writeFile(programFilePath, updatedContent);
  } else {
    // Fallback: try to insert before CreateWorkflows() directly
    const fallbackRegex = /(\s*)(WorkflowBuilderFactory\.CreateWorkflows\(\);)/;
    const fallbackMatch = programContent.match(fallbackRegex);
    if (fallbackMatch) {
      const indent = fallbackMatch[1];
      const newBuildCall = `${indent}${workflowName}.AddWorkflow();\n\n`;
      const updatedContent = programContent.replace(fallbackRegex, `${newBuildCall}$1$2`);
      await fse.writeFile(programFilePath, updatedContent);
    }
  }
};

export const createAgentCodefulWorkflowFile = async (
  logicAppFolderPath: string,
  logicAppName: string,
  workflowName: string,
  workflowType: WorkflowType
) => {
  const agentFileName = workflowType === WorkflowType.statefulCodeful ? 'StatefulCodefulFile' : 'AgentCodefulFile';
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const lspDirectoryPath = path.join(targetDirectory, lspDirectory);

  // Create the workflow-specific .cs file
  const capitalizedWorkflowName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1);
  const templateCSPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', agentFileName);
  const templateCSContent = (await fse.readFile(templateCSPath, 'utf-8'))
    .replace(/<%= flowNameClass %>/g, `${capitalizedWorkflowName}`)
    .replace(/<%= flowName %>/g, `"${workflowName}"`);

  // Generate workflow file with workflow name, not Program.cs
  const csFilePath = path.join(logicAppFolderPath, `${workflowName}.cs`);
  await fse.writeFile(csFilePath, templateCSContent);

  // Create or update Program.cs with the shared entry point
  const programFilePath = path.join(logicAppFolderPath, 'Program.cs');
  if (await fse.pathExists(programFilePath)) {
    // Program.cs exists, add this workflow to it
    await addWorkflowToProgram(programFilePath, capitalizedWorkflowName);
  } else {
    // Create new Program.cs
    const templateProgramPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', 'ProgramFile');
    const templateProgramContent = await fse.readFile(templateProgramPath, 'utf-8');
    const programContent = templateProgramContent.replace(/<%= workflowBuilders %>/g, `${capitalizedWorkflowName}.AddWorkflow();`);
    await fse.writeFile(programFilePath, programContent);

    // Create the .csproj file (only for first workflow)
    const templateProjPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', 'CodefulProj');
    const templateProjContent = await fse.readFile(templateProjPath, 'utf-8');
    const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);
    await fse.writeFile(csprojFilePath, templateProjContent);

    // Create nuget.config file (only for first workflow)
    const templateNugetPath = path.join(__dirname, assetsFolderName, 'CodefulProjectTemplate', 'nuget');
    const templateNugetContent = (await fse.readFile(templateNugetPath, 'utf-8')).replace(/<%= lspDirectory %>/g, `"${lspDirectoryPath}"`);
    const nugetFilePath = path.join(logicAppFolderPath, 'nuget.config');
    await fse.writeFile(nugetFilePath, templateNugetContent);
  }
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

  // Validate that workspaceProjectPath exists and has required properties
  if (!workspaceProjectPath || !workspaceProjectPath.fsPath) {
    const errorMessage = `[CreateWorkspaceStructure] Invalid workspaceProjectPath: ${JSON.stringify(
      {
        hasWorkspaceProjectPath: !!workspaceProjectPath,
        workspaceProjectPathType: typeof workspaceProjectPath,
        workspaceProjectPathValue: workspaceProjectPath,
        contextKeys: Object.keys(webviewProjectContext || {}),
      },
      null,
      2
    )}`;
    ext.outputChannel.appendLog(errorMessage);
    throw new Error(`workspaceProjectPath is required and must have an fsPath property. Received: ${JSON.stringify(workspaceProjectPath)}`);
  }

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

  // Add telemetry properties for debugging
  context.telemetry.properties.fromPackage = String(fromPackage);
  context.telemetry.properties.hasWorkspaceProjectPath = String(!!webviewProjectContext.workspaceProjectPath);
  context.telemetry.properties.workspaceProjectPathType = typeof webviewProjectContext.workspaceProjectPath;
  context.telemetry.properties.receivedOptionsKeys = Object.keys(options || {}).join(',');

  // Validate that workspaceProjectPath exists and has required properties
  if (!webviewProjectContext.workspaceProjectPath || !webviewProjectContext.workspaceProjectPath.fsPath) {
    // Log the received options for debugging
    const debugInfo = {
      hasWorkspaceProjectPath: !!webviewProjectContext.workspaceProjectPath,
      workspaceProjectPathType: typeof webviewProjectContext.workspaceProjectPath,
      workspaceProjectPathValue: webviewProjectContext.workspaceProjectPath,
      optionsKeys: Object.keys(options || {}),
      fromPackage,
      fullOptionsSnapshot: JSON.stringify(options, null, 2),
    };
    const errorMessage = `[CreateLogicAppWorkspace] Invalid workspaceProjectPath received: ${JSON.stringify(debugInfo, null, 2)}`;
    ext.outputChannel.appendLog(errorMessage);

    throw new Error(
      `workspaceProjectPath is required and must have an fsPath property. Received: ${JSON.stringify(webviewProjectContext.workspaceProjectPath)}. Full context keys: ${Object.keys(options || {}).join(', ')}`
    );
  }

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
    // Validate that packagePath exists and has required properties
    if (!options.packagePath || !options.packagePath.fsPath) {
      throw new Error('packagePath is required and must have an fsPath property when creating workspace from package');
    }
    mySubContext.packagePath = options.packagePath.fsPath;
    await unzipLogicAppPackageIntoWorkspace(mySubContext);
  } else {
    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath);
  }

  // .vscode folder
  await createLogicAppVsCodeContents(webviewProjectContext, logicAppFolderPath);

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

  // Check if we're in a workspace and get the workspace folder
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
  mySubContext.functionFolderName = options.functionFolderName;
  mySubContext.functionAppName = options.functionName;
  mySubContext.functionAppNamespace = options.functionNamespace;
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
