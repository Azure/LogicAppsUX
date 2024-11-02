import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import path from 'path';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import * as fs from 'fs';
import { rimraf } from 'rimraf';

export class ExtractPackageStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  public async prompt(context: IFunctionWizardContext): Promise<void> {
    const packageName = path.basename(context.packagePath, path.extname(context.packagePath));

    try {
      const data: Buffer | Buffer[] = fs.readFileSync(context.packagePath);
      await unzipLogicAppArtifacts(data, context.projectPath);

      const excludedFiles = [`${packageName}.csproj`, '.vscode', 'obj', 'bin', 'local.settings.json', 'host.json'];
      for (const file of excludedFiles) {
        if (fs.existsSync(path.join(context.projectPath, file))) {
          rimraf.sync(path.join(context.projectPath, file));
          context.telemetry.properties.excludedFile = `Excluded ${file} from package`;
        }
      }
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error(`Failed to extract contents of package to ${context.projectPath}`, error);
    }
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.packagePath !== undefined && context.projectPath !== undefined;
  }
}
