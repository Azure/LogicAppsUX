import type { IActionContext } from '@microsoft/vscode-azext-utils';

export interface IIdentityWizardContext extends IActionContext {
  clientId?: string;
  clientSecret?: string;
  objectId?: string;
  tenantId?: string;
  useAdvancedIdentity?: boolean;
}
