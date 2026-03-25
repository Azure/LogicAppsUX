import { describe, it, expect } from 'vitest';
import { supportedBaseManifestObjects } from '../base/operationmanifest';
import invokeFunctionManifest from '../base/manifests/invokefunction';
import { SettingScope } from '../../../utils/src';

const invokefunction = 'invokefunction';

describe('InvokeFunction Manifest', () => {
  describe('manifest registration', () => {
    it('should be registered in supportedBaseManifestObjects', () => {
      const manifest = supportedBaseManifestObjects.get(invokefunction);
      expect(manifest).toBeDefined();
    });

    it('should export the expected manifest', () => {
      expect(invokeFunctionManifest).toBeDefined();
      expect(invokeFunctionManifest.properties).toBeDefined();
    });
  });

  describe('manifest properties', () => {
    it('should have correct connector metadata', () => {
      const { connector } = invokeFunctionManifest.properties;
      expect(connector).toBeDefined();
      expect(connector?.id).toBe('connectionProviders/localFunctionOperation');
      expect(connector?.name).toBe('localFunctionOperation');
      expect(connector?.properties?.displayName).toBe('Call a local function in this logic app');
    });

    it('should have correct brand color and icon', () => {
      const { brandColor, iconUri } = invokeFunctionManifest.properties;
      expect(brandColor).toBe('#3999C6');
      expect(iconUri).toBe('https://logicappsv2resources.blob.core.windows.net/icons/invokefunction.svg');
    });
  });

  describe('manifest inputs', () => {
    it('should have required functionName input', () => {
      const { inputs } = invokeFunctionManifest.properties;
      expect(inputs).toBeDefined();
      expect(inputs?.type).toBe('object');
      expect(inputs?.required).toContain('functionName');
    });

    it('should have functionName and parameters properties', () => {
      const properties = invokeFunctionManifest.properties.inputs?.properties as Record<string, any>;
      expect(properties?.functionName).toBeDefined();
      expect(properties?.functionName?.type).toBe('string');
      expect(properties?.parameters).toBeDefined();
      expect(properties?.parameters?.type).toBe('object');
    });
  });

  describe('manifest outputs', () => {
    it('should have body output', () => {
      const { outputs } = invokeFunctionManifest.properties;
      expect(outputs).toBeDefined();
      expect(outputs?.type).toBe('object');
      const outputProperties = outputs?.properties as Record<string, any>;
      expect(outputProperties?.body).toBeDefined();
    });
  });

  describe('manifest settings', () => {
    it('should have retryPolicy setting with Action scope', () => {
      const { settings } = invokeFunctionManifest.properties;
      expect(settings).toBeDefined();
      expect(settings?.retryPolicy).toBeDefined();
      expect(settings?.retryPolicy?.scopes).toContain(SettingScope.Action);
    });

    it('should have timeout setting with Action scope', () => {
      const { settings } = invokeFunctionManifest.properties;
      expect(settings?.timeout).toBeDefined();
      expect(settings?.timeout?.scopes).toContain(SettingScope.Action);
    });

    it('should have trackedProperties setting with Action scope', () => {
      const { settings } = invokeFunctionManifest.properties;
      expect(settings?.trackedProperties).toBeDefined();
      expect(settings?.trackedProperties?.scopes).toContain(SettingScope.Action);
    });

    it('should have secureData setting', () => {
      const { settings } = invokeFunctionManifest.properties;
      expect(settings?.secureData).toBeDefined();
    });
  });
});
