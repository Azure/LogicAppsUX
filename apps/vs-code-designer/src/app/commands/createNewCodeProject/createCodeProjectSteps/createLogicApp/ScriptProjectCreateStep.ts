/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { gitignoreFileName, hostFileName, localSettingsFileName, logicAppKind } from '../../../../../constants';
import { addDefaultBundle } from '../../../../utils/bundleFeed';
import { confirmOverwriteFile, writeFormattedJson } from '../../../../utils/fs';
import { ProjectCodeCreateStepBase } from '../../CodeProjectBase/ProjectCodeCreateStepBase';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IHostJsonV1, IHostJsonV2, ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import type { Progress } from 'vscode';

/**
 * This class represents a step that creates the contents of a new script project.
 */
export class ScriptProjectCreateStep extends ProjectCodeCreateStepBase {
  // Set of files that should be ignored when creating a script project.
  protected funcignore: string[] = [
    '__blobstorage__',
    '__queuestorage__',
    '__azurite_db*__.json',
    '.git*',
    '.vscode',
    'local.settings.json',
    'test',
    '.debug',
    'global.json',
  ];
  protected gitignore = '';
  protected supportsManagedDependencies = false;

  /**
   * Executes the step to create the contents of the project.
   * @param context The project wizard context.
   * @param _progress The progress object to use for reporting progress.
   */
  public async executeCore(
    context: IProjectWizardContext,
    _progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    // Get the version of the Azure Functions runtime
    const version: FuncVersion = nonNullProp(context, 'version');

    // Create the host.json file
    const hostJsonPath: string = path.join(context.projectPath, hostFileName);
    if (await confirmOverwriteFile(context, hostJsonPath)) {
      const hostJson: IHostJsonV2 | IHostJsonV1 = version === FuncVersion.v1 ? {} : await this.getHostContent(context);
      await writeFormattedJson(hostJsonPath, hostJson);
    }

    // Create the local.settings.json file
    const localSettingsJsonPath: string = path.join(context.projectPath, localSettingsFileName);
    if (await confirmOverwriteFile(context, localSettingsJsonPath)) {
      const localSettingsJson: ILocalSettingsJson = {
        IsEncrypted: false,
        Values: {
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          WORKFLOWS_SUBSCRIPTION_ID: '',
          FUNCTIONS_WORKER_RUNTIME: 'node',
          APP_KIND: logicAppKind,
          AzureWebJobsFeatureFlags: 'EnableMultiLanguageWorker',
        },
      };
      await writeFormattedJson(localSettingsJsonPath, localSettingsJson);
    }

    // Create the .gitignore file
    const gitignorePath: string = path.join(context.projectPath, gitignoreFileName);
    if (await confirmOverwriteFile(context, gitignorePath)) {
      await fse.writeFile(
        gitignorePath,
        this.gitignore.concat(`
# Azure Functions artifacts
bin
obj
appsettings.json
local.settings.json
__blobstorage__
__queuestorage__
__azurite_db*__.json`)
      );
    }

    // Create the .funcignore file
    const funcIgnorePath: string = path.join(context.projectPath, '.funcignore');
    if (await confirmOverwriteFile(context, funcIgnorePath)) {
      await fse.writeFile(funcIgnorePath, this.funcignore.sort().join(os.EOL));
    }
  }

  /**
   * Gets the contents of the host.json file for the specified context.
   * @param context The action context.
   * @returns The contents of the host.json file.
   */
  protected async getHostContent(context: IActionContext): Promise<IHostJsonV2> {
    const hostJson: IHostJsonV2 = {
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
    };

    // Add the default bundle to the host.json file
    await addDefaultBundle(context, hostJson);

    return hostJson;
  }
}
