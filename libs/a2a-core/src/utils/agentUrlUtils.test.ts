import { describe, it, expect } from 'vitest';
import { isDirectAgentCardUrl } from './agentUrlUtils';

describe('agentUrlUtils', () => {
  describe('isDirectAgentCardUrl', () => {
    it('should return true for URLs with /.well-known/agent-card.json', () => {
      expect(isDirectAgentCardUrl('https://example.com/.well-known/agent-card.json')).toBe(true);
      expect(isDirectAgentCardUrl('http://localhost:3000/.well-known/agent-card.json')).toBe(true);
      expect(
        isDirectAgentCardUrl('https://subdomain.example.com/.well-known/agent-card.json')
      ).toBe(true);
    });

    it('should return true for URLs ending with .json', () => {
      expect(isDirectAgentCardUrl('https://example.com/agent.json')).toBe(true);
      expect(isDirectAgentCardUrl('https://example.com/path/to/agent-card.json')).toBe(true);
      expect(isDirectAgentCardUrl('https://example.com/data.json')).toBe(true);
    });

    it('should return false for URLs without .json extension', () => {
      expect(isDirectAgentCardUrl('https://example.com')).toBe(false);
      expect(isDirectAgentCardUrl('https://example.com/agent')).toBe(false);
      expect(isDirectAgentCardUrl('https://example.com/path/to/resource')).toBe(false);
    });

    it('should return false for URLs with .json in the middle but not at the end', () => {
      expect(isDirectAgentCardUrl('https://example.com/json/data')).toBe(false);
      expect(isDirectAgentCardUrl('https://example.com/file.json.backup')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isDirectAgentCardUrl('.json')).toBe(true);
      expect(isDirectAgentCardUrl('/.well-known/agent-card.json')).toBe(true);
      expect(isDirectAgentCardUrl('')).toBe(false);
    });
  });
});
