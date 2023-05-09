import * as fs from 'fs-extra';
import * as path from 'path';

export class VSCodeConfigGenerator {
  /**
   * Generates the VS Code configuration files in the specified folder.
   * @param folderPath The path to the folder where the configuration files should be generated.
   */
  public async generateConfigFiles(folderPath: string): Promise<void> {
    const logicAppFolderPath = context.functionFolderPath;

    // Create the necessary files and folders for VS Code under the Logic App folder path
    await fse.ensureDir(logicAppFolderPath);
    const vscodePath: string = path.join(logicAppFolderPath, '.vscode');
    await fse.ensureDir(vscodePath);
    // Create the .vscode folder if it doesn't exist
    const vscodeFolderPath = path.join(folderPath, '.vscode');
    await fs.ensureDir(vscodeFolderPath);

    // Generate the extensions.json file
    const extensionsJsonPath = path.join(vscodeFolderPath, 'extensions.json');
    const extensionsJsonContent = {
      recommendations: ['ms-azuretools.vscode-azurefunctions', 'ms-dotnettools.csharp'],
    };
    await fs.writeJson(extensionsJsonPath, extensionsJsonContent, { spaces: 2 });

    // Generate the launch.json file
    const launchJsonPath = path.join(vscodeFolderPath, 'launch.json');
    const launchJsonContent = {
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
    await fs.writeJson(launchJsonPath, launchJsonContent, { spaces: 2 });

    // Generate the settings.json file
    const settingsJsonPath = path.join(vscodeFolderPath, 'settings.json');
    const settingsJsonContent = {
      'azureFunctions.deploySubpath': 'bin/Release/net472/publish',
      'azureFunctions.projectLanguage': 'C#',
      'azureFunctions.projectRuntime': '~4',
      'debug.internalConsoleOptions': 'neverOpen',
      'azureFunctions.preDeployTask': 'publish (functions)',
      'azureFunctions.templateFilter': 'Core',
      'azureFunctions.showTargetFrameworkWarning': false,
      'azureFunctions.projectSubpath': 'bin\\Release\\net472\\publish',
    };
    await fs.writeJson(settingsJsonPath, settingsJsonContent, { spaces: 2 });

    // Generate the tasks.json file
    const tasksJsonPath = path.join(vscodeFolderPath, 'tasks.json');
    const tasksJsonContent = {
      version: '2.0.0',
      tasks: [
        {
          label: 'build',
          command: 'dotnet',
          type: 'process',
          args: ['build', '${workspaceFolder}'],
        },
      ],
    };
    await fs.writeJson(tasksJsonPath, tasksJsonContent, { spaces: 2 });
  }
}
