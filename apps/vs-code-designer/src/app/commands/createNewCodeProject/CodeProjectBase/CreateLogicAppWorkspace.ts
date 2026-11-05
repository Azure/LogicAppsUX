import {
  artifactsDirectory,
  autoRuntimeDependenciesPathSettingKey,
  devContainerFolderName,
  builtinOperationSdksFolderName,
  funcIgnoreFileName,
  gitignoreFileName,
  hostFileName,
  jarFolderName,
  libDirectory,
  localSettingsFileName,
  lspDirectory,
  rulesDirectory,
  schemasDirectory,
  testsDirectoryName,
  vscodeCommand,
  vscodeFolderName,
  workflowFileName,
} from '../../../../constants';
import { localize } from '../../../../localize';
import { ext } from '../../../../extensionVariables';
import { createArtifactsFolder } from '../../../utils/codeless/artifacts';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import { getAssetPath, getRuleSetTemplatePath, getWorkspaceTemplatePath } from '../../../utils/assets';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { gitInit, isGitInstalled, isInsideRepo } from '../../../utils/git';
import { writeFormattedJson } from '../../../utils/fs';
import { generateHostJson, generateLocalSettingsJson } from '../../../projectConsistency/fileGenerators';
import { getCodelessWorkflowTemplate } from '../../../utils/codeless/templates';
import { CreateFunctionAppFiles } from './CreateFunctionAppFiles';
import type { IFunctionWizardContext, IWebviewProjectContext, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import {
  OpenBehavior,
  ProjectType,
  TargetFramework,
  WorkflowType,
  isCsharpIdentifier,
  isCsharpNamespace,
} from '@microsoft/vscode-extension-logic-apps';
import { createDevContainerContents, createLogicAppVsCodeContents } from './CreateLogicAppVSCodeContents';
import { logicAppPackageProcessing, unzipLogicAppPackageIntoWorkspace } from '../../../utils/cloudToLocalUtils';
import { getGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { addCustomCodeDotNetVersionSetting } from '../../../utils/appSettings/localSettings';

export async function createRulesFiles(context: IFunctionWizardContext): Promise<void> {
  if (context.projectType === ProjectType.rulesEngine) {
    // SampleRuleSet.xml
    const sampleRuleSetPath = getRuleSetTemplatePath('SampleRuleSet');
    const sampleRuleSetXMLPath = path.join(context.projectPath, artifactsDirectory, rulesDirectory, 'SampleRuleSet.xml');
    const sampleRuleSetXMLContent = await fse.readFile(sampleRuleSetPath, 'utf-8');
    const sampleRuleSetXMLFileContent = sampleRuleSetXMLContent.replace(/<%= methodName %>/g, context.functionAppName);
    await fse.writeFile(sampleRuleSetXMLPath, sampleRuleSetXMLFileContent);

    // SchemaUser.xsd
    const schemaUserPath = getRuleSetTemplatePath('SchemaUser');
    const schemaUserXSDPath = path.join(context.projectPath, artifactsDirectory, schemasDirectory, 'SchemaUser.xsd');
    const schemaUserXSDContent = await fse.readFile(schemaUserPath, 'utf-8');
    await fse.writeFile(schemaUserXSDPath, schemaUserXSDContent);
  }
}

export async function createLibFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, libDirectory, builtinOperationSdksFolderName, jarFolderName), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, libDirectory, builtinOperationSdksFolderName, 'net472'), { recursive: true });
}

export async function createLogicAppAndWorkflow(
  webviewProjectContext: IWebviewProjectContext,
  logicAppFolderPath: string,
  context: IActionContext
) {
  const { logicAppType, workflowType, functionName, workflowName, logicAppName } = webviewProjectContext;

  context.telemetry.properties.logicAppType = logicAppType || 'logicApp';
  context.telemetry.properties.workflowType = workflowType || 'unknown';

  await fse.ensureDir(logicAppFolderPath);
  if (logicAppType === ProjectType.codeful) {
    await createCodefulWorkflowFile(logicAppFolderPath, logicAppName, workflowName, workflowType);
  } else {
    const codelessDefinition: StandardApp = getCodelessWorkflowTemplate(logicAppType, workflowType, functionName);
    if (webviewProjectContext.selectedProjects && workflowType !== WorkflowType.agentic && workflowType !== WorkflowType.agent) {
      codelessDefinition.definition.triggers = getCodelessWorkflowTemplate(ProjectType.customCode, workflowType).definition.triggers;
    }
    const logicAppWorkflowFolderPath = path.join(logicAppFolderPath, workflowName);
    await fse.ensureDir(logicAppWorkflowFolderPath);

    const workflowJsonFullPath: string = path.join(logicAppWorkflowFolderPath, workflowFileName);
    await writeFormattedJson(workflowJsonFullPath, codelessDefinition);
  }
}

const legacyAddWorkflowCallRegex = /^[ \t]*[A-Za-z_]\w*\.AddWorkflow\(\);\r?\n?/gm;

/**
 * Removes old static workflow registration calls from Program.cs.
 */
export const repairCodefulProgramFile = async (programFilePath: string): Promise<void> => {
  const programContent = await fse.readFile(programFilePath, 'utf-8');
  const updatedContent = programContent.replace(legacyAddWorkflowCallRegex, '');

  if (updatedContent === programContent) {
    return;
  }

  await fse.writeFile(programFilePath, updatedContent);
};

const getCodefulWorkflowTemplateFileName = (workflowType: WorkflowType): string => {
  switch (workflowType) {
    case WorkflowType.statefulCodeful:
      return 'StatefulCodefulWorkflow';
    case WorkflowType.agenticCodeful:
      return 'AgenticCodefulWorkflow';
    case WorkflowType.agentCodeful:
    default:
      return 'AgentCodefulWorkflow';
  }
};

export const createCodefulWorkflowFile = async (
  logicAppFolderPath: string,
  logicAppName: string,
  workflowName: string,
  workflowType: WorkflowType
) => {
  const workflowTemplateFileName = getCodefulWorkflowTemplateFileName(workflowType);
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const lspDirectoryPath = path.join(targetDirectory, lspDirectory);

  // Create the workflow-specific .cs file
  const capitalizedWorkflowName = (workflowName.charAt(0).toUpperCase() + workflowName.slice(1)).replace(/-/g, '_');
  const templateCSPath = getAssetPath('CodefulProjectTemplate', workflowTemplateFileName);
  const templateCSContent = (await fse.readFile(templateCSPath, 'utf-8'))
    .replace(/<%= logicAppNamespace %>/g, `${logicAppName}`)
    .replace(/<%= flowNameClass %>/g, `${capitalizedWorkflowName}`)
    .replace(/<%= flowName %>/g, `"${workflowName}"`);

  // Generate workflow file with workflow name, not Program.cs
  const csFilePath = path.join(logicAppFolderPath, `${workflowName}.cs`);
  await fse.writeFile(csFilePath, templateCSContent);

  // Create or update Program.cs with the shared entry point
  const programFilePath = path.join(logicAppFolderPath, 'Program.cs');
  if (await fse.pathExists(programFilePath)) {
    await repairCodefulProgramFile(programFilePath);
  } else {
    // Create new Program.cs
    const templateProgramPath = getAssetPath('CodefulProjectTemplate', 'ProgramFile');
    const templateProgramContent = await fse.readFile(templateProgramPath, 'utf-8');
    const programContent = templateProgramContent.replace(/<%= logicAppNamespace %>/g, `${logicAppName}`);
    await fse.writeFile(programFilePath, programContent);

    // Create the .csproj file (only for first workflow)
    const templateProjPath = getAssetPath('CodefulProjectTemplate', 'CodefulProj');
    const templateProjContent = await fse.readFile(templateProjPath, 'utf-8');
    const csprojFilePath = path.join(logicAppFolderPath, `${logicAppName}.csproj`);
    await fse.writeFile(csprojFilePath, templateProjContent);

    // Create nuget.config file (only for first workflow)
    const templateNugetPath = getAssetPath('CodefulProjectTemplate', 'nuget');
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
    '.debug',
    'workflow-designtime',
  ];
  const localSettingsJson = generateLocalSettingsJson(logicAppFolderPath, logicAppType);

  if (logicAppType !== ProjectType.logicApp) {
    funcignore.push('global.json');
  }

  if (logicAppType === ProjectType.codeful) {
    funcignore.push('.nuget', 'obj', 'bin');
  }

  const hostJsonPath: string = path.join(logicAppFolderPath, hostFileName);
  await writeFormattedJson(hostJsonPath, generateHostJson());

  const localSettingsJsonPath: string = path.join(logicAppFolderPath, localSettingsFileName);
  await writeFormattedJson(localSettingsJsonPath, localSettingsJson);

  const gitignorePath = path.join(logicAppFolderPath, gitignoreFileName);
  const gitIgnoreFile = 'GitIgnoreFile';
  const templatePath = getWorkspaceTemplatePath(gitIgnoreFile);
  await fse.copyFile(templatePath, gitignorePath);

  const funcIgnorePath: string = path.join(logicAppFolderPath, funcIgnoreFileName);
  await fse.writeFile(funcIgnorePath, funcignore.sort().join(os.EOL));
}

export async function createWorkspaceFiles(webviewProjectContext: IWebviewProjectContext): Promise<void> {
  const { workspaceProjectPath, workspaceName, logicAppName, functionFolderName, logicAppType } = webviewProjectContext;

  // Validate that workspaceProjectPath exists and has required properties
  if (!workspaceProjectPath || !workspaceProjectPath.fsPath) {
    const errorMessage = `[CreateWorkspaceFiles] Invalid workspaceProjectPath: ${JSON.stringify(
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

  if (webviewProjectContext.selectedProjects !== undefined) {
    const options = await validateSelectedProjects(webviewProjectContext);
    const workspaceFolder = path.join(options.workspaceProjectPath.fsPath, options.workspaceName);
    await fse.mkdir(workspaceFolder);
    try {
      await writeSelectedProjectsWorkspaceFile(options);
    } catch (error) {
      await fse.remove(workspaceFolder);
      throw error;
    }
    return;
  }

  //Create the workspace folder
  const workspaceFolder = path.join(workspaceProjectPath.fsPath, workspaceName);
  await fse.ensureDir(workspaceFolder);

  // Create the workspace .code-workspace file
  const workspaceFilePath = path.join(workspaceFolder, `${workspaceName}.code-workspace`);
  const workspaceFolders = [];
  workspaceFolders.push({ name: logicAppName, path: `./${logicAppName}` });

  // push functions folder
  if (logicAppType !== ProjectType.logicApp && logicAppType !== ProjectType.codeful) {
    workspaceFolders.push({ name: functionFolderName, path: `./${functionFolderName}` });
  }

  // Add .devcontainer folder for devcontainer projects
  if (webviewProjectContext.isDevContainerProject) {
    workspaceFolders.push({ name: devContainerFolderName, path: devContainerFolderName });
  }

  const workspaceData = {
    folders: workspaceFolders,
  };
  await fse.writeJson(workspaceFilePath, workspaceData, { spaces: 2 });
}

const validateProjectSegment = (value: string, field: string): void => {
  if (
    typeof value !== 'string' ||
    value.length > 240 ||
    !/^[a-zA-Z0-9_][a-zA-Z0-9_. -]*$/.test(value) ||
    /[. ]$/.test(value) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)
  ) {
    throw new Error(`${field} must be a valid single folder or project name.`);
  }
};

const validateSelectedProjects = async (options: IWebviewProjectContext): Promise<IWebviewProjectContext> => {
  const selected = options.selectedProjects;
  if (
    !selected ||
    !['logicApp', 'customCode', 'dataMap'].every((key) => typeof selected[key] === 'boolean') ||
    !(selected.logicApp || selected.customCode || selected.dataMap)
  ) {
    throw new Error('Select at least one project, with boolean logicApp, customCode, and dataMap selections.');
  }

  validateProjectSegment(options.workspaceName, 'workspaceName');
  if (typeof options.workspaceProjectPath?.fsPath !== 'string' || !path.isAbsolute(options.workspaceProjectPath.fsPath)) {
    throw new Error('workspaceProjectPath must be an absolute local directory path.');
  }
  const normalized = {
    ...options,
    logicAppFolderName: selected.logicApp ? (options.logicAppFolderName ?? options.logicAppName) : 'logic-app',
    functionFolderName: selected.customCode ? (options.functionFolderName ?? 'custom-code') : 'custom-code',
    dataMapFolderName: selected.dataMap ? (options.dataMapFolderName ?? 'data-map') : 'data-map',
    customCodeType: selected.customCode ? (options.customCodeType ?? ProjectType.customCode) : ProjectType.customCode,
    openBehavior: options.openBehavior ?? OpenBehavior.openInNewWindow,
  };
  const supportedOpenBehaviors: string[] = [OpenBehavior.openInNewWindow, OpenBehavior.openInCurrentWindow, OpenBehavior.dontOpen];
  if (!supportedOpenBehaviors.includes(normalized.openBehavior)) {
    throw new Error('Unsupported workspace openBehavior.');
  }
  if (options.isDevContainerProject) {
    throw new Error('Dev containers are not supported by the selected-project workspace wizard.');
  }
  const folders: string[] = [];
  if (selected.logicApp) {
    validateProjectSegment(options.logicAppName, 'logicAppName');
    validateProjectSegment(normalized.logicAppFolderName, 'logicAppFolderName');
    folders.push(normalized.logicAppFolderName);
    if (options.logicAppType !== ProjectType.logicApp && options.logicAppType !== ProjectType.codeful) {
      throw new Error('logicAppType must be logicApp or codeful.');
    }
    const workflowType: string = options.workflowType;
    const stateful = workflowType === WorkflowType.stateful || workflowType === 'Stateful';
    const stateless = workflowType === WorkflowType.stateless || workflowType === 'Stateless';
    if (options.logicAppType === ProjectType.codeful) {
      if (!stateful && options.workflowType !== WorkflowType.statefulCodeful) {
        throw new Error('Codeful projects currently support only the Stateful workflow template.');
      }
      normalized.workflowType = WorkflowType.statefulCodeful;
      if (!isCsharpNamespace(options.logicAppName)) {
        throw new Error('Codeful logicAppName must be a valid C# namespace.');
      }
      if (!isCsharpIdentifier(options.workflowName) || options.workflowName.toLowerCase() === 'program') {
        throw new Error('Codeful workflowName must be a C# identifier other than Program.');
      }
    } else {
      if (!stateful && !stateless && workflowType !== WorkflowType.agentic && workflowType !== WorkflowType.agent) {
        throw new Error('Select a Stateful, Stateless, Autonomous agents, or Conversational agents workflow.');
      }
      normalized.workflowType = stateful ? WorkflowType.stateful : stateless ? WorkflowType.stateless : options.workflowType;
    }
    validateProjectSegment(options.workflowName, 'workflowName');
    if (['artifacts', 'lib', 'bin', 'obj', 'workflow-designtime'].includes(options.workflowName.toLowerCase())) {
      throw new Error('workflowName collides with a reserved project folder.');
    }
  }
  if (selected.customCode) {
    validateProjectSegment(normalized.functionFolderName, 'functionFolderName');
    folders.push(normalized.functionFolderName);
    if (normalized.customCodeType !== ProjectType.customCode && normalized.customCodeType !== ProjectType.rulesEngine) {
      throw new Error('Select customCode or rulesEngine.');
    }
    if (!Object.values(TargetFramework).includes(options.targetFramework)) {
      throw new Error('Unsupported targetFramework.');
    }
    if (normalized.customCodeType === ProjectType.rulesEngine && options.targetFramework !== TargetFramework.NetFx) {
      throw new Error('Rules Engine supports only net472.');
    }
    validateProjectSegment(options.functionName, 'functionName');
    if (!isCsharpIdentifier(options.functionName) || options.functionName.toLowerCase() === 'program') {
      throw new Error('functionName must be a C# identifier other than Program.');
    }
    if (!isCsharpNamespace(options.functionNamespace)) {
      throw new Error('functionNamespace must be a valid C# namespace.');
    }
    if (normalized.customCodeType === ProjectType.rulesEngine && options.functionName.toLowerCase() === 'contosopurchase') {
      throw new Error('functionName collides with the Rules Engine sample class.');
    }
  }
  if (selected.dataMap) {
    validateProjectSegment(options.dataMapName, 'dataMapName');
    if (typeof normalized.dataMapFolderName !== 'string' || normalized.dataMapFolderName.length > 240) {
      throw new Error('dataMapFolderName must be a valid relative project path.');
    }
    for (const segment of normalized.dataMapFolderName.split('/')) {
      validateProjectSegment(segment, 'dataMapFolderName');
    }
    folders.push(normalized.dataMapFolderName);
  }
  const uniqueFolders = new Set(folders.map((folder) => folder.toLowerCase()));
  const workspaceFile = `${options.workspaceName}.code-workspace`.toLowerCase();
  const overlappingFolders = [...uniqueFolders].some(
    (folder) =>
      folder.split('/')[0] === workspaceFile ||
      [...uniqueFolders].some((otherFolder) => folder !== otherFolder && folder.startsWith(`${otherFolder}/`))
  );
  if (uniqueFolders.size !== folders.length || overlappingFolders) {
    throw new Error('Selected project folders must be distinct and cannot collide with the workspace file.');
  }
  if (selected.logicApp && options.logicAppType === ProjectType.codeful) {
    const dependenciesPath = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
    if (typeof dependenciesPath !== 'string' || !path.isAbsolute(dependenciesPath)) {
      throw new Error('Codeful generation requires a configured absolute runtime dependencies path.');
    }
  }
  if (!(await fse.stat(options.workspaceProjectPath.fsPath)).isDirectory()) {
    throw new Error('workspaceProjectPath must be an existing directory.');
  }
  if (await fse.pathExists(path.join(options.workspaceProjectPath.fsPath, options.workspaceName))) {
    throw new Error('The workspace destination already exists. Choose a new workspace name.');
  }
  if (selected.dataMap) {
    const mapper = vscode.extensions.getExtension('microsoft.btm-data-mapper');
    if (!mapper) {
      throw new Error('Install and enable the Logic App Data Mapper v3 extension before creating a Data Map project.');
    }
    const commands = mapper.packageJSON?.contributes?.commands;
    if (!Array.isArray(commands) || !commands.some((command) => command.command === 'biztalkDataMapper.createProject')) {
      throw new Error('Update the Logic App Data Mapper v3 extension to support workspace project creation.');
    }
    await mapper.activate();
  }
  return normalized;
};

const writeSelectedProjectsWorkspaceFile = async (options: IWebviewProjectContext): Promise<void> => {
  const workspaceFolder = path.join(options.workspaceProjectPath.fsPath, options.workspaceName);
  const folders = [];
  if (options.selectedProjects.logicApp) {
    folders.push({ name: options.logicAppName, path: `./${options.logicAppFolderName}` });
  }
  if (options.selectedProjects.customCode) {
    folders.push({ name: options.functionFolderName, path: `./${options.functionFolderName}` });
  }
  if (options.selectedProjects.dataMap) {
    folders.push({ name: path.posix.basename(options.dataMapFolderName), path: `./${options.dataMapFolderName}` });
  }
  await fse.writeJson(path.join(workspaceFolder, `${options.workspaceName}.code-workspace`), { folders }, { spaces: 2 });
};

const createSelectedProjectsWorkspace = async (context: IActionContext, options: IWebviewProjectContext): Promise<void> => {
  const normalized = await validateSelectedProjects(options);
  const workspaceFolder = path.join(normalized.workspaceProjectPath.fsPath, normalized.workspaceName);
  await fse.mkdir(workspaceFolder);
  try {
    await writeSelectedProjectsWorkspaceFile(normalized);
    const logicAppFolderPath = path.join(workspaceFolder, normalized.logicAppFolderName);
    const functionContext = {
      ...context,
      workspacePath: workspaceFolder,
      projectPath: normalized.selectedProjects.logicApp ? logicAppFolderPath : path.join(workspaceFolder, normalized.functionFolderName),
      logicAppName: normalized.selectedProjects.logicApp ? normalized.logicAppFolderName : normalized.functionFolderName,
      projectType: normalized.customCodeType,
      functionFolderName: normalized.functionFolderName,
      functionAppName: normalized.functionName,
      functionAppNamespace: normalized.functionNamespace,
      targetFramework: normalized.targetFramework,
    } as IFunctionWizardContext;

    if (normalized.selectedProjects.logicApp) {
      await createLogicAppAndWorkflow(normalized, logicAppFolderPath, context);
      const hostOptions = {
        ...normalized,
        targetFramework: normalized.logicAppType === ProjectType.codeful ? TargetFramework.Net8 : normalized.targetFramework,
        logicAppType:
          normalized.logicAppType === ProjectType.logicApp && normalized.selectedProjects.customCode
            ? normalized.customCodeType
            : normalized.logicAppType,
      };
      await createLogicAppVsCodeContents(hostOptions, logicAppFolderPath);
      await createLocalConfigurationFiles(hostOptions, logicAppFolderPath);
      await createArtifactsFolder(functionContext);
      await createLibFolder(functionContext);
      if (normalized.selectedProjects.customCode) {
        await createRulesFiles(functionContext);
        await addCustomCodeDotNetVersionSetting(context, logicAppFolderPath, normalized.customCodeType, normalized.targetFramework);
      }
    }

    if (normalized.selectedProjects.customCode) {
      await new CreateFunctionAppFiles().setup(functionContext);
    }

    if (normalized.selectedProjects.dataMap) {
      const dataMapFolder = path.join(workspaceFolder, normalized.dataMapFolderName);
      await vscode.commands.executeCommand('biztalkDataMapper.createProject', vscode.Uri.file(dataMapFolder), normalized.dataMapName);
    }

    if ((await isGitInstalled(workspaceFolder)) && !(await isInsideRepo(workspaceFolder))) {
      await gitInit(workspaceFolder);
    }
  } catch (error) {
    await fse.remove(workspaceFolder);
    throw error;
  }
  ext.outputChannel.appendLog(localize('finishedCreating', 'Finished creating project.'));
  if (normalized.openBehavior !== OpenBehavior.dontOpen) {
    await vscode.commands.executeCommand(
      vscodeCommand.openFolder,
      vscode.Uri.file(path.join(workspaceFolder, `${normalized.workspaceName}.code-workspace`)),
      normalized.openBehavior === OpenBehavior.openInNewWindow
    );
  }
};

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

  await fse.writeJson(context.workspaceFilePath, workspaceContent, { spaces: 2 });
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

  if (webviewProjectContext.selectedProjects !== undefined && !fromPackage) {
    await createSelectedProjectsWorkspace(context, webviewProjectContext);
    return;
  }

  await createWorkspaceFiles(fromPackage ? { ...webviewProjectContext, selectedProjects: undefined } : webviewProjectContext);

  // Create the workspace folder
  const workspaceFolder = path.join(webviewProjectContext.workspaceProjectPath.fsPath, webviewProjectContext.workspaceName);
  // Path to the logic app folder
  const logicAppFolderPath = path.join(workspaceFolder, webviewProjectContext.logicAppName);
  const workspaceFilePath = path.join(workspaceFolder, `${webviewProjectContext.workspaceName}.code-workspace`);

  const mySubContext: IFunctionWizardContext = context as IFunctionWizardContext;
  mySubContext.logicAppName = options.logicAppName;
  mySubContext.projectPath = logicAppFolderPath;
  mySubContext.projectType = webviewProjectContext.logicAppType;
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
    await createLogicAppAndWorkflow(webviewProjectContext, logicAppFolderPath, context);
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
    ext.outputChannel.appendLog(localize('finishedExtractingPackage', 'Finished extracting package into a logic app workspace.'));
  } else {
    if (webviewProjectContext.logicAppType === ProjectType.customCode || webviewProjectContext.logicAppType === ProjectType.rulesEngine) {
      const createFunctionAppFilesStep = new CreateFunctionAppFiles();
      await createFunctionAppFilesStep.setup(mySubContext);
    }

    // Records the .NET version used by the associated custom-code project (net8/net10.0) in the
    // Logic App's own local.settings.json, at context.projectPath, the authoritative Logic App project
    // directory. No-op for rulesEngine, codeful, standard, or NetFx.
    await addCustomCodeDotNetVersionSetting(context, mySubContext.projectPath, mySubContext.projectType, mySubContext.targetFramework);

    ext.outputChannel.appendLog(localize('finishedCreating', 'Finished creating project.'));
  }

  await vscode.commands.executeCommand(vscodeCommand.openFolder, vscode.Uri.file(workspaceFilePath), true /* forceNewWindow */);
}
