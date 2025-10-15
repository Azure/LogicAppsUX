import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { verifyLocalConnectionKeys } from '../../utils/appSettings/connectionKeys';

/**
 * Validates local connection keys and creates Access Control Lists (ACLs) for the workflow.
 * Sets the MSI (Managed Service Identity) flag to true upon successful validation.
 *
 * @param context - The action context containing telemetry and error handling properties
 * @param _node - Optional node parameter (currently unused)
 * @throws {Error} Throws an error if validation or ACL creation fails, with issue reporting suppressed
 */
export function validateAndCreateACLs(context: IActionContext, _node?: unknown): void {
  try {
    verifyLocalConnectionKeys(context);
    ext.useMSI = true;
    context.telemetry.properties.validateAndCreateACLs = 'true';
    ext.outputChannel.appendLog(
      localize('validateAndCreateACLs.success', 'Successfully validated connection keys and created ACLs. MSI is enabled.')
    );
  } catch (error) {
    const errorMessage = localize('validateAndCreateACLs.error', 'Failed to validate and create ACLs: {0}', error.message || error);
    context.errorHandling.suppressReportIssue = true;
    throw new Error(errorMessage);
  }
}
