import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import path from 'path';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import * as fs from 'fs';
import { rimraf } from 'rimraf';

export class ExtractPackageStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public async prompt(context: IFunctionWizardContext): Promise<void> {
    try {
      const data: Buffer | Buffer[] = fs.readFileSync(context.packagePath);
      await unzipLogicAppArtifacts(data, context.projectPath);

      const projectFiles = fs.readdirSync(context.projectPath);
      const filesToExclude = [];
      const excludedFiles = ['.vscode', 'obj', 'bin', 'local.settings.json', 'host.json'];
      const excludedExt = ['.csproj'];

      projectFiles.forEach((fileName) => {
        if (excludedExt.includes(path.extname(fileName))) {
          filesToExclude.push(path.join(context.projectPath, fileName));
        }
      });

      excludedFiles.forEach((excludedFile) => {
        if (fs.existsSync(path.join(context.projectPath, excludedFile))) {
          filesToExclude.push(path.join(context.projectPath, excludedFile));
        }
      });

      filesToExclude.forEach((path) => {
        rimraf.sync(path);
        context.telemetry.properties.excludedFile = `Excluded ${path.basename} from package`;
      });
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error(`Failed to extract contents of package to ${context.projectPath}`, error);
    }
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.packagePath !== undefined && context.projectPath !== undefined;
  }
}
