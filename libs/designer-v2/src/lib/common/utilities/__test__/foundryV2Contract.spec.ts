import { describe, it, expect } from 'vitest';
import { AgentUtils } from '../Utils';

describe('Foundry V2 contract regression tests', () => {
  describe('ManifestToDisplayName mapping', () => {
    it('maps FoundryAgentServiceV2 to the FoundryService display name', () => {
      expect(AgentUtils.ManifestToDisplayName['FoundryAgentServiceV2']).toBe(AgentUtils.ModelType.FoundryService);
    });

    it('does NOT have a mapping for FoundryAgentService (V1)', () => {
      expect(AgentUtils.ManifestToDisplayName['FoundryAgentService']).toBeUndefined();
    });

    it('reverse mapping DisplayNameToManifest maps FoundryService back to FoundryAgentServiceV2', () => {
      const displayName = AgentUtils.ModelType.FoundryService;
      expect(AgentUtils.DisplayNameToManifest[displayName]).toBe('FoundryAgentServiceV2');
    });
  });

  describe('isFoundryAgentNameParameter', () => {
    it('returns true for foundryAgentName', () => {
      expect(AgentUtils.isFoundryAgentNameParameter('foundryAgentName')).toBe(true);
    });

    it('returns true for FoundryAgentName (case-insensitive)', () => {
      expect(AgentUtils.isFoundryAgentNameParameter('FoundryAgentName')).toBe(true);
    });

    it('returns false for foundryAgentId (V1 field)', () => {
      expect(AgentUtils.isFoundryAgentNameParameter('foundryAgentId')).toBe(false);
    });

    it('returns false for deploymentId', () => {
      expect(AgentUtils.isFoundryAgentNameParameter('deploymentId')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(AgentUtils.isFoundryAgentNameParameter('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(AgentUtils.isFoundryAgentNameParameter(undefined)).toBe(false);
    });
  });

  describe('No V1 string literal in utility mappings', () => {
    it('ManifestToDisplayName does not contain FoundryAgentService key', () => {
      expect(Object.keys(AgentUtils.ManifestToDisplayName)).not.toContain('FoundryAgentService');
    });

    it('DisplayNameToManifest does not contain FoundryAgentService value', () => {
      expect(Object.values(AgentUtils.DisplayNameToManifest)).not.toContain('FoundryAgentService');
    });
  });
});
