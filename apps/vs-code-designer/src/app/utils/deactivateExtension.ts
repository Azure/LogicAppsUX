/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { stopAllDesignTimeApis } from './codeless/startDesignTimeApi';
import { stopAllFuncTasks } from './funcCoreTools/funcHostTask';

export async function deactivateExtension(): Promise<void> {
  await Promise.all([stopAllDesignTimeApis(), stopAllFuncTasks()]);
  try {
    await ext.languageClient?.stop();
  } finally {
    ext.languageClient = undefined;
    ext.telemetryReporter.dispose();
  }
}
