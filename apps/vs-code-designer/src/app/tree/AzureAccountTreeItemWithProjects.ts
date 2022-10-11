/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting, projectSubpathSetting } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { isLocalProjectCV, isProjectCV, isRemoteProjectCV } from './projectContextValues';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { AzureAccountTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { commands, Disposable, extensions, workspace } from 'vscode';

export class AzureAccountTreeItemWithProjects extends AzureAccountTreeItemBase {
  private _currentLoggedInSessions: any;
  private _projectDisposables: Disposable[] = [];

  public constructor(testAccount?: Record<string, never>) {
    super(undefined, testAccount);
    this.disposables.push(
      workspace.onDidChangeWorkspaceFolders(async () => {
        await callWithTelemetryAndErrorHandling(
          'AzureAccountTreeItemWithProjects.onDidChangeWorkspaceFolders',
          async (context: IActionContext) => {
            // eslint-disable-next-line no-param-reassign
            context.errorHandling.suppressDisplay = true;
            // eslint-disable-next-line no-param-reassign
            context.telemetry.suppressIfSuccessful = true;
            await this.refresh(context);
          }
        );
      })
    );
    this.disposables.push(
      workspace.onDidChangeConfiguration(async (e) => {
        await callWithTelemetryAndErrorHandling(
          'AzureAccountTreeItemWithProjects.onDidChangeConfiguration',
          async (context: IActionContext) => {
            // eslint-disable-next-line no-param-reassign
            context.errorHandling.suppressDisplay = true;
            // eslint-disable-next-line no-param-reassign
            context.telemetry.suppressIfSuccessful = true;
            const settings: string[] = [projectLanguageSetting, funcVersionSetting, projectSubpathSetting];
            if (settings.some((s) => e.affectsConfiguration(`${ext.prefix}.${s}`))) {
              await this.refresh(context);
            }
          }
        );
      })
    );
  }

  public dispose(): void {
    super.dispose();
    Disposable.from(...this._projectDisposables).dispose();
  }

  // Work to be done
  public createSubscriptionTreeItem(): undefined {
    return undefined;
  }

  public async getAccountCredentials(tenantId?: string): Promise<ServiceClientCredentials | undefined> {
    const extension = extensions.getExtension('ms-vscode.azure-account');
    if (extension) {
      if (!extension.isActive) {
        await extension.activate();
      }
      const azureAccount = extension.exports;
      if (!(await azureAccount.waitForLogin())) {
        await commands.executeCommand('azure-account.askForLogin');
      }

      await azureAccount.waitForFilters();
      this._currentLoggedInSessions = azureAccount.sessions;
    }

    if (this._currentLoggedInSessions) {
      return this._getCredentialsForSessions(this._currentLoggedInSessions, tenantId);
    }

    return undefined;
  }

  public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    const children: AzExtTreeItem[] = await super.loadMoreChildrenImpl(clearCache, context);
    return children;
  }

  public compareChildrenImpl(_item1: AzExtTreeItem, _item2: AzExtTreeItem): number {
    return -1;
  }

  public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): Promise<AzExtTreeItem | undefined> {
    const subscription: string = localize('subscription', 'subscription');

    if (expectedContextValues.some(isProjectCV)) {
      if (expectedContextValues.some(isLocalProjectCV) && expectedContextValues.some(isRemoteProjectCV)) {
        this.childTypeLabel = localize('projectOrSubscription', 'project or subscription');
      } else if (expectedContextValues.some(isLocalProjectCV)) {
        this.childTypeLabel = localize('project', 'project');
      } else {
        this.childTypeLabel = subscription;
      }
    } else {
      this.childTypeLabel = subscription;
    }

    return super.pickTreeItemImpl(expectedContextValues);
  }

  private _getCredentialsForSessions(sessions: any, tenantId?: string): ServiceClientCredentials {
    if (tenantId) {
      const tenantDetails = sessions.filter((session) => session.tenantId.toLowerCase() == tenantId);
      return tenantDetails.length ? tenantDetails[0].credentials2 : sessions[0].credentials2;
    } else {
      return sessions[0].credentials;
    }
  }
}
