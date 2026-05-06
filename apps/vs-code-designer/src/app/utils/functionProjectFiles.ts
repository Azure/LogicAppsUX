/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { usesPublishFolderProperty } from './debug';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Maps target framework / project type to .cs template file names.
 */
export const csTemplateFileNames: Record<string, string> = {
  [TargetFramework.NetFx]: 'FunctionsFileNetFx',
  [TargetFramework.Net8]: 'FunctionsFileNet8',
  [TargetFramework.Net10]: 'FunctionsFileNet10',
  [ProjectType.rulesEngine]: 'RulesFunctionsFile',
};

/**
 * Maps target framework / project type to .csproj template file names.
 */
export const csprojTemplateFileNames: Record<string, string> = {
  [TargetFramework.NetFx]: 'FunctionsProjNetFx',
  [TargetFramework.Net8]: 'FunctionsProjNet8',
  [TargetFramework.Net10]: 'FunctionsProjNet10',
  [ProjectType.rulesEngine]: 'RulesFunctionsProj',
};

/**
 * Maps project type to template folder names under the assets directory.
 */
export const templateFolderNames: Record<string, string> = {
  [ProjectType.customCode]: 'FunctionProjectTemplate',
  [ProjectType.rulesEngine]: 'RuleSetProjectTemplate',
};

/**
 * Resolves the correct template file name based on project type and target framework.
 * Rules engine projects use their own templates; custom code projects use framework-specific ones.
 */
function resolveTemplateFileName(templateMap: Record<string, string>, projectType: ProjectType, targetFramework: TargetFramework): string {
  return projectType === ProjectType.rulesEngine ? templateMap[ProjectType.rulesEngine] : templateMap[targetFramework];
}

/**
 * Creates the .cs file inside the functions folder from a template.
 * @param assetsPath - Base path to the assets directory.
 * @param functionFolderPath - The path to the functions folder.
 * @param methodName - The name of the method.
 * @param namespace - The name of the namespace.
 * @param projectType - The workspace project type.
 * @param targetFramework - The target framework.
 */
export async function createCsFile(
  assetsPath: string,
  functionFolderPath: string,
  methodName: string,
  namespace: string,
  projectType: ProjectType,
  targetFramework: TargetFramework
): Promise<void> {
  const templateFile = resolveTemplateFileName(csTemplateFileNames, projectType, targetFramework);
  const templatePath = path.join(assetsPath, templateFolderNames[projectType], templateFile);
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const csFilePath = path.join(functionFolderPath, `${methodName}.cs`);
  const csFileContent = templateContent.replace(/<%= methodName %>/g, methodName).replace(/<%= namespace %>/g, namespace);
  await fs.writeFile(csFilePath, csFileContent);
}

/**
 * Creates the Program.cs file for .NET 10 isolated worker model.
 * Only generates for .NET 10 custom code projects (not rules engine).
 * @param assetsPath - Base path to the assets directory.
 * @param functionFolderPath - The path to the functions folder.
 * @param namespace - The name of the namespace.
 * @param projectType - The workspace project type.
 * @param targetFramework - The target framework.
 */
export async function createProgramFile(
  assetsPath: string,
  functionFolderPath: string,
  namespace: string,
  projectType: ProjectType,
  targetFramework: TargetFramework
): Promise<void> {
  if (targetFramework !== TargetFramework.Net10 || projectType === ProjectType.rulesEngine) {
    return;
  }

  const templatePath = path.join(assetsPath, 'FunctionProjectTemplate', 'ProgramFileNet10');
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const content = templateContent.replace(/<%= namespace %>/g, namespace);
  await fs.writeFile(path.join(functionFolderPath, 'Program.cs'), content);
}

/**
 * Creates the ContosoPurchase.cs rules file for rules engine projects.
 * @param assetsPath - Base path to the assets directory.
 * @param functionFolderPath - The path to the functions folder.
 */
export async function createRulesFiles(assetsPath: string, functionFolderPath: string): Promise<void> {
  const csTemplatePath = path.join(assetsPath, 'RuleSetProjectTemplate', 'ContosoPurchase');
  const csRuleSetPath = path.join(functionFolderPath, 'ContosoPurchase.cs');
  await fs.copyFile(csTemplatePath, csRuleSetPath);
}

/**
 * Creates a .csproj file for a function app from a template.
 * @param assetsPath - Base path to the assets directory.
 * @param functionFolderPath - The path to the functions folder.
 * @param methodName - The name of the Azure Function.
 * @param logicAppName - The name of the logic app.
 * @param projectType - The workspace project type.
 * @param targetFramework - The target framework.
 */
export async function createCsprojFile(
  assetsPath: string,
  functionFolderPath: string,
  methodName: string,
  logicAppName: string,
  projectType: ProjectType,
  targetFramework: TargetFramework
): Promise<void> {
  const templateFile = resolveTemplateFileName(csprojTemplateFileNames, projectType, targetFramework);
  const templatePath = path.join(assetsPath, templateFolderNames[projectType], templateFile);
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const csprojFilePath = path.join(functionFolderPath, `${methodName}.csproj`);
  const csprojFileContent = usesPublishFolderProperty(projectType, targetFramework)
    ? templateContent.replace(
        /<LogicAppFolderToPublish>\$\(MSBuildProjectDirectory\)\\..\\LogicApp<\/LogicAppFolderToPublish>/g,
        `<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\${logicAppName}</LogicAppFolderToPublish>`
      )
    : templateContent.replace(/<LogicAppFolder>LogicApp<\/LogicAppFolder>/g, `<LogicAppFolder>${logicAppName}</LogicAppFolder>`);
  await fs.writeFile(csprojFilePath, csprojFileContent);
}
