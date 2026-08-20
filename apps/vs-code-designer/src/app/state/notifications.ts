/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import {
  suppressAutoStartAzuriteNotificationState,
  suppressAutoStartDesignTimeNotificationState,
  suppressDesignerVersionNotificationState,
  suppressManagedIdentityAuthNotificationState,
  suppressMultiCoreToolsWarningState,
  suppressNodeJsWarningState,
  suppressParameterizeConnectionsNotificationState,
} from '../../constants';

/**
 * Whether the user has permanently dismissed the auto-start Azurite prompt.
 */
export function isAutoStartAzuriteNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressAutoStartAzuriteNotificationState) === true;
}

/**
 * Permanently suppresses the auto-start Azurite prompt.
 */
export async function suppressAutoStartAzuriteNotification(): Promise<void> {
  await ext.context.globalState.update(suppressAutoStartAzuriteNotificationState, true);
}

/**
 * Whether the user has permanently dismissed the auto-start design-time startup prompt.
 */
export function isAutoStartDesignTimeNotificationSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressAutoStartDesignTimeNotificationState) === true;
}

/**
 * Permanently suppresses the auto-start design-time startup prompt.
 */
export async function suppressAutoStartDesignTimeNotification(): Promise<void> {
  await ext.context.globalState.update(suppressAutoStartDesignTimeNotificationState, true);
}

/**
 * Whether the user has permanently dismissed the multiple func core tools warning.
 */
export function isMultiCoreToolsWarningSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressMultiCoreToolsWarningState) === true;
}

/**
 * Permanently suppresses the multiple func core tools warning.
 */
export async function suppressMultiCoreToolsWarning(): Promise<void> {
  await ext.context.globalState.update(suppressMultiCoreToolsWarningState, true);
}

/**
 * Whether the user has permanently dismissed the Node.js update warning.
 */
export function isNodeJsWarningSuppressed(): boolean {
  return ext.context.globalState.get<boolean>(suppressNodeJsWarningState) === true;
}

/**
 * Permanently suppresses the Node.js update warning.
 */
export async function suppressNodeJsWarning(): Promise<void> {
  await ext.context.globalState.update(suppressNodeJsWarningState, true);
}

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
