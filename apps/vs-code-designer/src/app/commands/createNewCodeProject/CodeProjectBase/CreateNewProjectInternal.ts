import { funcVersionSetting, projectLanguageSetting, projectOpenBehaviorSetting, projectTemplateKeySetting } from '../../../../constants';
import { localize } from '../../../../localize';
import { createArtifactsFolder } from '../../../utils/codeless/artifacts';
import { addLocalFuncTelemetry, tryGetLocalFuncVersion, tryParseFuncVersion } from '../../../utils/funcCoreTools/funcVersion';
import { getGlobalSetting, getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { FolderListStep } from '../../createNewProject/createProjectSteps/FolderListStep';
import { OpenFolderStepCodeProject } from './OpenFolderStepCodeProject';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { latestGAVersion, OpenBehavior, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { ICreateFunctionOptions, IFunctionWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { window } from 'vscode';

export async function createRulesFiles(context: IFunctionWizardContext): Promise<void> {
  if (context.projectType === ProjectType.rulesEngine) {
    // SampleRuleSet.xml
    const sampleRuleSetPath = path.join(__dirname, 'assets', 'RuleSetProjectTemplate', 'SampleRuleSet');
    const sampleRuleSetXMLPath = path.join(context.projectPath, 'Artifacts', 'Rules', 'SampleRuleSet.xml');
    const sampleRuleSetXMLContent = await fse.readFile(sampleRuleSetPath, 'utf-8');
    const sampleRuleSetXMLFileContent = sampleRuleSetXMLContent.replace(/<%= methodName %>/g, context.methodName);
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
  fse.mkdirSync(path.join(context.projectPath, 'lib', 'custom', 'net472'), { recursive: true });
}

export async function createNewProjectInternalBase(
  context: IActionContext,
  options: ICreateFunctionOptions,
  title: string,
  message: string,
  promptSteps: any[]
): Promise<void> {
  addLocalFuncTelemetry(context);

  const language: ProjectLanguage | string = (options.language as ProjectLanguage) || getGlobalSetting(projectLanguageSetting);
  const version: string = options.version || getGlobalSetting(funcVersionSetting) || (await tryGetLocalFuncVersion()) || latestGAVersion;
  const projectTemplateKey: string | undefined = getGlobalSetting(projectTemplateKeySetting);
  const wizardContext: Partial<IFunctionWizardContext> & IActionContext = Object.assign(context, options, {
    language,
    version: tryParseFuncVersion(version),
    projectTemplateKey,
  });

  if (options.folderPath) {
    FolderListStep.setProjectPath(wizardContext, options.folderPath);
  }

  if (options.suppressOpenFolder) {
    wizardContext.openBehavior = OpenBehavior.dontOpen;
  } else if (!wizardContext.openBehavior) {
    wizardContext.openBehavior = getWorkspaceSetting(projectOpenBehaviorSetting);
    context.telemetry.properties.openBehaviorFromSetting = String(!!wizardContext.openBehavior);
  }

  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    title: localize(title, message),
    promptSteps,
    executeSteps: [new OpenFolderStepCodeProject()],
  });

  await wizard.prompt();
  await wizard.execute();

  await createArtifactsFolder(context as IFunctionWizardContext);
  await createRulesFiles(context as IFunctionWizardContext);
  await createLibFolder(context as IFunctionWizardContext);

  window.showInformationMessage(localize('finishedCreating', 'Finished creating project.'));
}
