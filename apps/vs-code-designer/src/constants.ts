/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from './localize';

export const projectLanguageSetting = 'projectLanguage';
export const funcVersionSetting = 'projectRuntime';
export const projectSubpathSetting = 'projectSubpath';

// File names
export const hostFileName = 'host.json';
export const localSettingsFileName = 'local.settings.json';
export const connectionsFileName = 'connections.json';
export const parametersFileName = 'parameters.json';

// Functions
export const func = 'func';

// Workflow
export const workflowLocationKey = 'WORKFLOWS_LOCATION_NAME';
export const workflowResourceGroupNameKey = 'WORKFLOWS_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';
export const workflowAppApiVersion = '2018-11-01';

export const logicAppKind = 'workflowapp';
export const workflowappRuntime = 'node|14';

export const viewOutput = localize('viewOutput', 'View Output');

// Designer
export const managementApiPrefix = '/runtime/webhooks/workflow/api/management';
export const designerStartApi = '/runtime/webhooks/workflow/api/management/operationGroups';
export const workflowDesignerLoadTimeout = 300000;

// Commands
export enum extensionCommand {
  openDesigner = 'logicAppsExtension.openDesigner',
  loadMore = 'logicAppsExtension.loadMore',
  activate = 'logicAppsExtension.activate',
}

// Context
export const contextValuePrefix = 'azFunc';

// API
export const defaultRoutePrefix = 'api';
export const timeoutKey = 'requestTimeout';
