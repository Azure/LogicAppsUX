import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that generates the host.json and local.settings.json files in the workflow-designtime folder.
 */
export class DesignerConfig extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Generates the host.json and local.settings.json files in the workflow-designtime folder.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const folderPath = context.logicAppFolderPath;
    // Create the necessary files and folders for Visual Studio Code under the logic app folder path
    await fs.ensureDir(folderPath);
    const configPath: string = path.join(folderPath, 'workflow-designtime');
    await fs.ensureDir(configPath);

    // Generate the host.json file
    await this.generateHostJson(configPath);

    //generate local.settings.json
    await this.generateLocalSettingsJson(configPath, context);
  }

  /**
   * Generates the host.json file in the specified folder.
   * @param folderPath The path to the folder where the host.json file should be generated.
   */
  private async generateHostJson(folderPath: string): Promise<void> {
    const filePath = path.join(folderPath, 'host.json');
    const content = {
      version: '2.0',
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
        version: '[1.0, 2.0)',
      },
      extensions: {
        workflow: {
          settings: {
            'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
          },
        },
      },
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Generates the local.settings.json file in the specified folder.
   * @param folderPath The path to the folder where the local.settings.json file should be generated.
   */
  private async generateLocalSettingsJson(folderPath: string, context: IProjectWizardContext): Promise<void> {
    const filePath = path.join(folderPath, 'local.settings.json');
    const designerProjPath: string = context.logicAppFolderPath;
    const content = {
      IsEncrypted: false,
      Values: {
        AzureWebJobsSecretStorageType: 'Files',
        FUNCTIONS_WORKER_RUNTIME: 'node',
        ProjectDirectoryPath: designerProjPath,
      },
    };
    await fs.writeJson(filePath, content, { spaces: 2 });
  }

  /**
   * Determines whether the user should be prompted to generate the Visual Studio Code configuration files.
   * @param context The project wizard context.
   * @returns True if the user has not yet generated the Visual Studio Code configuration files, false otherwise.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !fs.existsSync(path.join(context.logicAppFolderPath, 'workflow-designtime'));
  }
}
