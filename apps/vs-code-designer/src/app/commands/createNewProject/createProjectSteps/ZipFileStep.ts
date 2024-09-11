import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData, IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';

import * as rimraf from 'rimraf';

export class ZipFileStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  private zipContent: Buffer | Buffer[];
  private targetDirectory: string;
  public static zipFilePath: string;
  private wizardContext: IFunctionWizardContext;

  public hideStepCount = true;
  public supportsDuplicateSteps = false;

  // will likely need to change the location of the start zip path
  public static async setZipFilePath(_context: Partial<IFunctionWizardContext>): Promise<void> {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
      openLabel: localize('selectZipFile', 'Select a zip file'),
    });

    if (fileUris && fileUris.length > 0) {
      ZipFileStep.zipFilePath = fileUris[0].fsPath;
    }
  }

  public async prompt(context: IFunctionWizardContext): Promise<void> {
    this.wizardContext = context;
    await ZipFileStep.setZipFilePath(context);
    await this.getZipFiles();
  }

  public shouldPrompt(_context: IFunctionWizardContext): boolean {
    return this.zipContent === undefined;
  }

  public async getZipFiles(): Promise<IAzureQuickPickItem<Buffer>[]> {
    if (!this.wizardContext) {
      console.error('wizardContext is not set in getzipfILes.');
      return []; // Return early if wizardContext is not set
    }
    try {
      if (ZipFileStep.zipFilePath) {
        this.zipContent = fs.readFileSync(ZipFileStep.zipFilePath);
        this.targetDirectory = path.join(this.wizardContext.workspacePath, this.wizardContext.logicAppName); // path arguments receiving undefined
        await unzipLogicAppArtifacts(this.zipContent, this.targetDirectory);

        const zipBaseName = path.basename(ZipFileStep.zipFilePath, path.extname(ZipFileStep.zipFilePath));
        const excludedFiles = [`${zipBaseName}.csproj`, '.vscode', 'obj', 'bin', 'local.settings.json', 'host.json'];

        for (const file of excludedFiles) {
          rimraf.sync(path.join(this.targetDirectory, file));
        }
      }
    } catch (error) {
      console.error('Failed to unzip the Logic App artifacts', error);
    }
    return Promise.resolve([]);
  }

  public async getConnectionsJsonContent(context: IFunctionWizardContext): Promise<ConnectionsData> {
    this.wizardContext = context;
    try {
      if (!this.wizardContext) {
        console.error('wizardContext is not set in getconncetions.');
        return null; // Early return if wizardContext is not set
      }
      this.targetDirectory = this.wizardContext.workspacePath;
      const connectionsJsonPath = path.join(this.targetDirectory, 'connections.json');

      if (fs.existsSync(connectionsJsonPath)) {
        const connectionsJsonContent = fs.readFileSync(connectionsJsonPath, 'utf8');
        const connection = JSON.parse(connectionsJsonContent);

        return connection; // Return the parsed connections object
      }
    } catch (error) {
      console.error('Failed to process connections.json', error);
    }
    return null; // Return null or appropriate error handling
  }
}
