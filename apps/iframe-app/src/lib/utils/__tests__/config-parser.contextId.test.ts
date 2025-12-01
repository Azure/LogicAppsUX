import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseIframeConfig } from '../config-parser';

describe('config-parser - contextId support', () => {
  beforeEach(() => {
    // Reset window.location
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000/iframe');

    // Clear dataset by removing all data attributes
    const dataset = document.documentElement.dataset;
    Object.keys(dataset).forEach((key) => {
      delete dataset[key];
    });

    // Clear console mocks
    vi.clearAllMocks();
  });

  it('should parse contextId from URL parameters', () => {
    (window as any).location = new URL(
      'http://localhost:3000/iframe?agentCard=test&contextId=ctx-123'
    );

    const config = parseIframeConfig();

    expect(config.contextId).toBe('ctx-123');
  });

  it('should parse contextId from data attributes', () => {
    document.documentElement.dataset.agentCard = 'test';
    document.documentElement.dataset.contextId = 'ctx-456';

    const config = parseIframeConfig();

    expect(config.contextId).toBe('ctx-456');
  });

  it('should prefer URL parameter over data attribute for contextId', () => {
    (window as any).location = new URL(
      'http://localhost:3000/iframe?agentCard=test&contextId=ctx-url'
    );
    document.documentElement.dataset.contextId = 'ctx-data';

    const config = parseIframeConfig();

    expect(config.contextId).toBe('ctx-url');
  });

  it('should return undefined when no contextId is provided', () => {
    (window as any).location = new URL('http://localhost:3000/iframe?agentCard=test');

    const config = parseIframeConfig();

    expect(config.contextId).toBeUndefined();
  });

  it('should log when contextId is found', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    (window as any).location = new URL(
      'http://localhost:3000/iframe?agentCard=test&contextId=ctx-789'
    );

    parseIframeConfig();

    expect(consoleLogSpy).toHaveBeenCalledWith('Using contextId:', 'ctx-789');

    consoleLogSpy.mockRestore();
  });

  it('should handle contextId with special characters', () => {
    const contextId = 'ctx_123-456.789~abc';
    (window as any).location = new URL(
      `http://localhost:3000/iframe?agentCard=test&contextId=${encodeURIComponent(contextId)}`
    );

    const config = parseIframeConfig();

    expect(config.contextId).toBe(contextId);
  });

  it('should work with both single and multi-session modes', () => {
    // Single session with contextId
    (window as any).location = new URL(
      'http://localhost:3000/iframe?agentCard=test&contextId=ctx-single&singleSession=true'
    );

    let config = parseIframeConfig();

    expect(config.contextId).toBe('ctx-single');
    expect(config.multiSession).toBe(false);

    // Multi-session with contextId (contextId will be available but not used)
    (window as any).location = new URL(
      'http://localhost:3000/iframe?agentCard=test&contextId=ctx-multi&singleSession=false'
    );

    config = parseIframeConfig();

    expect(config.contextId).toBe('ctx-multi');
    expect(config.multiSession).toBe(true);
  });
});
