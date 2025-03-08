import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import path from 'path';
import { unzipLogicAppArtifacts } from '../../../utils/taskUtils';
import * as fse from 'fs-extra';

export class ExtractPackageStep extends AzureWizardPromptStep<IFunctionWizardContext> {
  /**
   * Unzips package contents to package path and removes unnecessary files
   * @param context - Project wizard context containing user selections and settings
   */
  public async prompt(context: IFunctionWizardContext): Promise<void> {
    try {
      const data: Buffer | Buffer[] = fse.readFileSync(context.packagePath);
      await unzipLogicAppArtifacts(data, context.projectPath);

      const projectFiles = fse.readdirSync(context.projectPath);
      const filesToExclude = [];
      const excludedFiles = ['.vscode', 'obj', 'bin', 'local.settings.json', 'host.json'];
      const excludedExt = ['.csproj'];

      projectFiles.forEach((fileName) => {
        if (excludedExt.includes(path.extname(fileName))) {
          filesToExclude.push(path.join(context.projectPath, fileName));
        }
      });

      excludedFiles.forEach((excludedFile) => {
        if (fse.existsSync(path.join(context.projectPath, excludedFile))) {
          filesToExclude.push(path.join(context.projectPath, excludedFile));
        }
      });

      filesToExclude.forEach((path) => {
        fse.removeSync(path);
        context.telemetry.properties.excludedFile = `Excluded ${path.basename} from package`;
      });

      // Create README.md file
      const readMePath = path.join(__dirname, 'assets', 'readmes', 'importReadMe.md');
      const readMeContent = fse.readFileSync(readMePath, 'utf8');
      fse.writeFileSync(path.join(context.projectPath, 'README.md'), readMeContent);
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error(`Failed to extract contents of package to ${context.projectPath}`, error);
    }
  }

  /**
   * Checks if this step should prompt the user
   * @param context - Project wizard context containing user selections and settings
   * @returns True if user should be prompted, otherwise false
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.packagePath !== undefined && context.projectPath !== undefined;
  }
}
