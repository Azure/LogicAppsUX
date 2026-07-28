/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { suppressDesignerVersionNotificationState } from '../../constants';
import { ext } from '../../extensionVariables';

/**
 * Returns whether the designer version notification has been suppressed by the user.
 */
export function isDesignerVersionNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressDesignerVersionNotificationState) === true;
}

/**
 * Suppresses the designer version notification.
 */
export async function suppressDesignerVersionNotification(): Promise<void> {
  await ext.context.globalState.update(suppressDesignerVersionNotificationState, true);
}
