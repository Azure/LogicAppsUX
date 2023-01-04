/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { PackageManager } from '../../constants';
import { validateFuncCoreToolsSetting } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { executeCommand } from '../utils/funcCoreTools/cpUtils';
import { getWorkspaceSetting } from '../utils/vsCodeConfig/settings';
import { getFuncPackageManagers } from './getFuncPackageManagers';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function validateFuncCoreToolsInstalled(context: IActionContext, message: string, fsPath: string): Promise<boolean> {
  let input: MessageItem | undefined;
  let installed = false;
  const install: MessageItem = { title: localize('install', 'Install') };

  await callWithTelemetryAndErrorHandling('logicAppsExtension.validateFuncCoreToolsInstalled', async (innerContext: IActionContext) => {
    innerContext.errorHandling.suppressDisplay = true;

    if (!getWorkspaceSetting<boolean>(validateFuncCoreToolsSetting, fsPath)) {
      innerContext.telemetry.properties.validateFuncCoreTools = 'false';
      installed = true;
    } else if (await funcToolsInstalled()) {
      installed = true;
    } else {
      const items: MessageItem[] = [];
      const packageManagers: PackageManager[] = await getFuncPackageManagers(false /* isFuncInstalled */);
      if (packageManagers.length > 0) {
        items.push(install);
      } else {
        items.push(DialogResponses.learnMore);
      }

      input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);

      innerContext.telemetry.properties.dialogResult = input.title;

      if (input === install) {
        // TODO (ccastrotrejo): Work to be done when implement install func core tools
        // const version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, fsPath));
        // await installFuncCoreTools(innerContext,packageManagers, version);
        installed = true;
      } else if (input === DialogResponses.learnMore) {
        await openUrl('https://aka.ms/Dqur4e');
      }
    }
  });

  // validate that Func Tools was installed only if user confirmed
  if (input === install && !installed) {
    if (
      (await context.ui.showWarningMessage(
        localize('failedInstallFuncTools', 'The Azure Functions Core Tools installion has failed and will have to be installed manually.'),
        DialogResponses.learnMore
      )) === DialogResponses.learnMore
    ) {
      await openUrl('https://aka.ms/Dqur4e');
    }
  }

  return installed;
}

export async function funcToolsInstalled(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, ext.funcCliPath, '--version');
    return true;
  } catch (error) {
    return false;
  }
}
