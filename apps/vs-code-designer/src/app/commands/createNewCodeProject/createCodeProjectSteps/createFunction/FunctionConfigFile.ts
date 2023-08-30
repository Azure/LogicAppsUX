import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that generates the Visual Studio Code configuration files in the specified folder.
 */
export class FunctionConfigFile extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Generates the Visual Studio Code configuration files in the specified folder.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const folderPath = context.functionFolderPath;

    // Create the necessary files and folders for Visual Studio Code under the logic app folder path.
    await fs.ensureDir(folderPath);
    const vscodePath: string = path.join(folderPath, '.vscode');
    await fs.ensureDir(vscodePath);

    // Generate the extensions.json file
    await this.generateExtensionsJson(vscodePath);

    // Generate the launch.json file
    await this.generateLaunchJson(vscodePath);

    // Generate the settings.json file
    await this.generateSettingsJson(vscodePath);

    // Generate the tasks.json file
    await this.generateTasksJson(vscodePath);
  }

  /**
   * Determines whether the user should be prompted to generate the Visual Studio Code configuration files.
   * @param context The project wizard context.
   * @returns True if the user hasn't yet generated the Visual Studio Code configuration files. Otherwise, returns False.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !fs.existsSync(path.join(context.functionFolderPath, '.vscode'));
  }

  /**
   * Generates the extensions.json file in the specified folder.
   * @param folderPath The path to the folder where the extensions.json file should be generated.
   */
  private async generateExtensionsJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, 'extensions.json');
    const content = {
      recommendations: ['ms-azuretools.vscode-azurefunctions', 'ms-dotnettools.csharp'],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the launch.json file in the specified folder.
   * @param folderPath The path to the folder where the launch.json file should be generated.
   */
  private async generateLaunchJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, 'launch.json');
    const content = {
      version: '0.2.0',
      configurations: [
        {
          name: 'Attach to .NET Functions',
          type: 'clr',
          request: 'attach',
          processName: 'Microsoft.Azure.Workflows.Functions.NetFxWorker.exe',
        },
      ],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the settings.json file in the specified folder.
   * @param folderPath The path to the folder where the settings.json file should be generated.
   */
  private async generateSettingsJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, 'settings.json');
    const content = {
      'azureFunctions.deploySubpath': 'bin/Release/net472/publish',
      'azureFunctions.projectLanguage': 'C#',
      'azureFunctions.projectRuntime': '~4',
      'debug.internalConsoleOptions': 'neverOpen',
      'azureFunctions.preDeployTask': 'publish (functions)',
      'azureFunctions.templateFilter': 'Core',
      'azureFunctions.showTargetFrameworkWarning': false,
      'azureFunctions.projectSubpath': 'bin\\Release\\net472\\publish',
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the tasks.json file in the specified folder.
   * @param folderPath The path to the folder where the tasks.json file should be generated.
   */
  private async generateTasksJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, 'tasks.json');
    const content = {
      version: '2.0.0',
      tasks: [
        {
          label: 'build',
          command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
          type: 'process',
          args: ['build', '${workspaceFolder}'],
          group: {
            kind: 'build',
            isDefault: true,
          },
        },
      ],
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }
}
