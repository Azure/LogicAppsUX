/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { generateHostJson, generateDesignTimeHostJson } from '../hostGenerator';
import {
	extensionBundleId,
	defaultVersionRange,
	workflowOperationDiscoveryHostModeKey,
} from '../../../../../constants';

describe('hostGenerator', () => {
  describe('generateHostJson', () => {
    it('should return version "2.0"', () => {
      const result = generateHostJson();

      expect(result.version).toBe('2.0');
    });

    it('should include extensionBundle with correct id and version range', () => {
      const result = generateHostJson();

      expect(result.extensionBundle).toBeDefined();
      expect(result.extensionBundle.id).toBe(extensionBundleId);
      expect(result.extensionBundle.id).toBe('Microsoft.Azure.Functions.ExtensionBundle.Workflows');
      expect(result.extensionBundle.version).toBe(defaultVersionRange);
      expect(result.extensionBundle.version).toBe('[1.*, 2.0.0)');
    });

    it('should include logging.applicationInsights.samplingSettings', () => {
      const result = generateHostJson();

      expect(result.logging).toBeDefined();
      expect(result.logging.applicationInsights).toBeDefined();
      expect(result.logging.applicationInsights.samplingSettings).toBeDefined();
      expect(result.logging.applicationInsights.samplingSettings.isEnabled).toBe(true);
      expect(result.logging.applicationInsights.samplingSettings.excludedTypes).toBe('Request');
    });
  });

  describe('generateDesignTimeHostJson', () => {
    it('should return version "2.0"', () => {
      const result = generateDesignTimeHostJson();

      expect(result.version).toBe('2.0');
    });

    it('should include extensionBundle with correct id and version range', () => {
      const result = generateDesignTimeHostJson();

      expect(result.extensionBundle).toBeDefined();
      expect(result.extensionBundle.id).toBe(extensionBundleId);
      expect(result.extensionBundle.id).toBe('Microsoft.Azure.Functions.ExtensionBundle.Workflows');
      expect(result.extensionBundle.version).toBe(defaultVersionRange);
      expect(result.extensionBundle.version).toBe('[1.*, 2.0.0)');
    });

    it('should include extensions.workflow.settings with operation discovery mode enabled', () => {
      const result = generateDesignTimeHostJson();

      expect(result.extensions).toBeDefined();
      expect(result.extensions.workflow).toBeDefined();
      expect(result.extensions.workflow.settings).toBeDefined();
      expect(result.extensions.workflow.settings[workflowOperationDiscoveryHostModeKey]).toBe('true');
      expect(result.extensions.workflow.settings['Runtime.WorkflowOperationDiscoveryHostMode']).toBe('true');
    });

    it('should NOT include logging section', () => {
      const result = generateDesignTimeHostJson();

      expect(result.logging).toBeUndefined();
    });
  });
});
