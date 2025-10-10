/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs-extra';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import { ext } from '../../../../extensionVariables';

export class DevcontainerStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    await this.createDevcontainerFiles(context);
  }

  private async createDevcontainerFiles(context: IProjectWizardContext): Promise<void> {
    // Resolve source directory with canonical container config. When running from compiled dist the
    // source 'container' folder may live beside 'src' or only within 'src/container'. Try a set of candidates.
    const candidateDirs: string[] = [path.join(ext.context.extensionPath, 'assets', 'container')];

    let sourceContainerDir: string | undefined;
    for (const dir of candidateDirs) {
      if (await fs.pathExists(dir)) {
        sourceContainerDir = dir;
        break;
      }
    }

    // Create .devcontainer folder at the same level as .code-workspace file
    const devcontainerPath = path.join(context.workspacePath, '.devcontainer');
    await fs.ensureDir(devcontainerPath);

    // Files we expect in the source directory
    const filesToCopy = ['devcontainer.json', 'docker-compose.yml', 'Dockerfile'];

    if (!sourceContainerDir) {
      // Could not locate source directory; create marker file and return gracefully.
      await fs.writeFile(
        path.join(devcontainerPath, 'README.missing-devcontainer.txt'),
        `Devcontainer source templates not found. Looked in:\n${candidateDirs.join('\n')}\n`
      );
      return;
    }

    for (const fileName of filesToCopy) {
      const src = path.join(sourceContainerDir, fileName);
      const dest = path.join(devcontainerPath, fileName);
      try {
        if (await fs.pathExists(src)) {
          await fs.copyFile(src, dest);
        } else {
          await fs.writeFile(`${dest}.missing`, `Expected source file not found: ${src}`);
        }
      } catch (err) {
        await fs.writeFile(`${dest}.error`, `Error copying ${fileName}: ${(err as Error).message}`);
      }
    }
  }
}
