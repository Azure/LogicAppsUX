/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import {
  suppressDesignerVersionNotificationState,
  suppressManagedIdentityAuthNotificationState,
  suppressParameterizeConnectionsNotificationState,
} from '../../constants';

/**
 * Whether the user has permanently dismissed the parameterize-connections startup prompt.
 */
export function isParameterizeConnectionsNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressParameterizeConnectionsNotificationState) === true;
}

/**
 * Permanently suppresses the parameterize-connections startup prompt.
 */
export async function suppressParameterizeConnectionsNotification(): Promise<void> {
  await ext.context.globalState.update(suppressParameterizeConnectionsNotificationState, true);
}

/**
 * Whether the user has permanently dismissed the managed-identity auth startup prompt.
 */
export function isManagedIdentityAuthNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressManagedIdentityAuthNotificationState) === true;
}

/**
 * Permanently suppresses the managed-identity auth startup prompt.
 */
export async function suppressManagedIdentityAuthNotification(): Promise<void> {
  await ext.context.globalState.update(suppressManagedIdentityAuthNotificationState, true);
}

/**
 * Whether the user has permanently dismissed the designer version notification.
 */
export function isDesignerVersionNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressDesignerVersionNotificationState) === true;
}

/**
 * Permanently suppresses the designer version notification.
 */
export async function suppressDesignerVersionNotification(): Promise<void> {
  await ext.context.globalState.update(suppressDesignerVersionNotificationState, true);
}
