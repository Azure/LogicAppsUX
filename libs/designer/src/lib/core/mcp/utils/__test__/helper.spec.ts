import { describe, it, expect } from 'vitest';
import { isHttpRequestTrigger } from '../helper';

describe('isHttpRequestTrigger', () => {
  describe('when trigger is an HTTP request trigger', () => {
    it('should return true for request type with Http kind', () => {
      const trigger = {
        type: 'Request',
        kind: 'Http',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });

    it('should return true for request type without kind (defaults to Http)', () => {
      const trigger = {
        type: 'Request',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });

    it('should return true for request type with undefined kind', () => {
      const trigger = {
        type: 'Request',
        kind: undefined,
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });

    it('should be case-insensitive for type', () => {
      const trigger = {
        type: 'Request',
        kind: 'Http',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });

    it('should be case-insensitive for kind', () => {
      const trigger = {
        type: 'Request',
        kind: 'HTTP',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });

    it('should be case-insensitive for both type and kind', () => {
      const trigger = {
        type: 'REQUEST',
        kind: 'http',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(true);
    });
  });

  describe('when trigger is not an HTTP request trigger', () => {
    it('should return false for non-request type', () => {
      const trigger = {
        type: 'recurrence',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(false);
    });

    it('should return false for request type with non-Http kind', () => {
      const trigger = {
        type: 'Request',
        kind: 'PowerAppV2',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(false);
    });

    it('should return false for http type (not request)', () => {
      const trigger = {
        type: 'http',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(false);
    });

    it('should return false for ApiConnection type', () => {
      const trigger = {
        type: 'ApiConnection',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(false);
    });

    it('should return false for request type with Button kind', () => {
      const trigger = {
        type: 'Request',
        kind: 'Button',
        inputs: {},
      };
      expect(isHttpRequestTrigger(trigger)).toBe(false);
    });
  });
});
