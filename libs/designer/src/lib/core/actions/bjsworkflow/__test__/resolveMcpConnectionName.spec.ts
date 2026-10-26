import { describe, it, expect } from 'vitest';
import { resolveMcpConnectionName } from '../serializer';

// Locks in the defense against Redux's `changeConnectionMapping` minting a fresh referenceKey that
// doesn't match `connections.agentMcpConnections`. `serializeHost`'s McpConnection case must emit
// the connection.id's last segment when a reference is present, and fall back to the referenceKey
// otherwise. See PR description: "Defense in `serializeHost`'s `McpConnection` case".
describe('resolveMcpConnectionName', () => {
  it('uses the connection.id last segment when it is present', () => {
    // Redux minted `mcpclient-9`, but the actual connection.id points at `mcpclient-8` — emit the latter.
    expect(resolveMcpConnectionName('mcpclient-9', '/connectionProviders/mcpclient/connections/mcpclient-8')).toBe('mcpclient-8');
  });

  it('returns the referenceKey when they agree (happy path, no divergence)', () => {
    expect(resolveMcpConnectionName('mcpclient', '/connectionProviders/mcpclient/connections/mcpclient')).toBe('mcpclient');
  });

  it('falls back to the referenceKey when connectionId is undefined', () => {
    expect(resolveMcpConnectionName('mcpclient-9', undefined)).toBe('mcpclient-9');
  });

  it('falls back to the referenceKey when connectionId is empty', () => {
    expect(resolveMcpConnectionName('mcpclient-9', '')).toBe('mcpclient-9');
  });

  it('handles a trailing-slash connection.id by falling back to referenceKey', () => {
    // `.split('/').pop()` on `.../mcpclient-8/` returns '' which is falsy, so we fall back.
    expect(resolveMcpConnectionName('mcpclient-9', '/connectionProviders/mcpclient/connections/mcpclient-8/')).toBe('mcpclient-9');
  });

  it('supports connection.id without a leading slash', () => {
    expect(resolveMcpConnectionName('mcpclient-9', 'connectionProviders/mcpclient/connections/mcpclient-8')).toBe('mcpclient-8');
  });
});
