/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fse from 'fs-extra';
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getWorkflowNode } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { OpenDesignerForAzureResource } from './openDesignerForAzureResource';
import OpenDesignerForLocalProject from './openDesignerForLocalProject';
import { Uri } from 'vscode';
import { buildCustomCodeFunctionsProject } from '../../buildCustomCodeFunctionsProject';

export async function openDesigner(context: IAzureConnectorsContext, node: Uri | RemoteWorkflowTreeItem | undefined): Promise<void> {
  let openDesignerObj: OpenDesignerForLocalProject | OpenDesignerForAzureResource;

  const workflowNode = getWorkflowNode(node);

  if (workflowNode instanceof Uri) {
    try {
      const logicAppNode = Uri.file(path.join(workflowNode.fsPath, '../../'));
      // Only build custom code projects on open designer if custom code binaries don't already exist in the logic app folder
      if (!(await fse.pathExists(path.join(logicAppNode.fsPath, 'lib', 'custom')))) {
        await buildCustomCodeFunctionsProject(context, logicAppNode);
      }
    } catch {
      // Ignore error if thrown, forego building custom code project
    }

    openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode);
  } else if (workflowNode instanceof RemoteWorkflowTreeItem) {
    openDesignerObj = new OpenDesignerForAzureResource(context, workflowNode);
  }

  await openDesignerObj?.createPanel();
}
