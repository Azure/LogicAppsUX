import * as fs from 'fs-extra';
import * as path from 'path';

export class DesignTimeConfig {
  private readonly logicAppFolderPath: string;

  /**
   * Creates a new instance of the DesignTimeConfig class.
   * @param logicAppFolderPath The path to the Logic App folder.
   */
  public constructor(logicAppFolderPath: string) {
    this.logicAppFolderPath = logicAppFolderPath;
  }

  /**
   * Generates the design-time configuration files for the Logic App.
   */
  public async generate(): Promise<void> {
    const designTimeFolderPath = path.join(this.logicAppFolderPath, 'workflow-designtime');
    await fs.ensureDir(designTimeFolderPath);

    const hostJsonPath = path.join(designTimeFolderPath, 'host.json');
    const hostJsonData = this.generateHostJson();
    await this.writeJsonFile(hostJsonPath, hostJsonData);

    const localSettingsJsonPath = path.join(designTimeFolderPath, 'local.settings.json');
    const localSettingsJsonData = this.generateLocalSettingsJson();
    await this.writeJsonFile(localSettingsJsonPath, localSettingsJsonData);
  }

  /**
   * Generates the JSON object for the host.json file.
   * @returns The JSON object for the host.json file.
   */
  private generateHostJson(): any {
    return {
      version: '2.0',
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
        version: '[1.0, 2.0)',
      },
      extensions: {
        workflow: {
          settings: {
            'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
            'Runtime.IsInvokeFunctionActionEnabled': 'true',
          },
        },
      },
    };
  }

  /**
   * Generates the JSON object for the local.settings.json file.
   * @returns The JSON object for the local.settings.json file.
   */
  private generateLocalSettingsJson(): any {
    return {
      IsEncrypted: false,
      Values: {
        AzureWebJobsSecretStorageType: 'Files',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      },
    };
  }

  /**
   * Writes a JSON object to a file.
   * @param filePath The path to the file to write.
   * @param data The JSON object to write to the file.
   */
  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    await fs.writeJSON(filePath, data, { spaces: 2 });
  }
}
