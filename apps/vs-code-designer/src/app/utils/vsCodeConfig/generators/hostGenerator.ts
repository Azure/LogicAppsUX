/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultVersionRange, extensionBundleId, workflowOperationDiscoveryHostModeKey } from '../../../../constants';
import type { IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';

/**
 * Generates the canonical root host.json content for a Logic App project.
 */
export function generateHostJson(): IHostJsonV2 {
  return {
    version: '2.0',
    logging: {
      applicationInsights: {
        samplingSettings: {
          isEnabled: true,
          excludedTypes: 'Request',
        },
      },
    },
    extensionBundle: {
      id: extensionBundleId,
      version: defaultVersionRange,
    },
  };
}

/**
 * Generates the canonical design-time host.json content.
 * Enables workflow operation discovery host mode for the design-time API.
 */
export function generateDesignTimeHostJson(): Record<string, unknown> {
  return {
    version: '2.0',
    extensionBundle: {
      id: extensionBundleId,
      version: defaultVersionRange,
    },
    extensions: {
      workflow: {
        settings: {
          [workflowOperationDiscoveryHostModeKey]: 'true',
        },
      },
    },
  };
}
