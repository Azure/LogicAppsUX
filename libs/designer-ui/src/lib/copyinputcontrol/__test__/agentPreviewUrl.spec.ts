import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as logicAppsShared from '@microsoft/logic-apps-shared';
import { isSafeAgentPreviewUrl } from '../agentPreviewUrl';

describe('lib/copyinputcontrol/agentPreviewUrl', () => {
  let mockLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLog = vi.fn();
    vi.spyOn(logicAppsShared, 'LoggerService').mockReturnValue({
      log: mockLog,
      startTrace: vi.fn(),
      endTrace: vi.fn(),
      logErrorWithFormatting: vi.fn(),
    } as any);
  });

  describe('isSafeAgentPreviewUrl', () => {
    it('allows a plain https url', () => {
      expect(isSafeAgentPreviewUrl('https://trusted.example.invalid/chat')).toBe(true);
    });

    it('allows https urls across differing legitimate cloud origins', () => {
      expect(isSafeAgentPreviewUrl('https://another-cloud-host.example.invalid/agent/preview')).toBe(true);
      expect(isSafeAgentPreviewUrl('https://sub.domain.cloud.example.invalid:8443/chat?x=1')).toBe(true);
    });

    it('allows the documented http loopback hosts (localhost, 127.0.0.1, IPv6 [::1])', () => {
      expect(isSafeAgentPreviewUrl('http://localhost:3000/chat')).toBe(true);
      expect(isSafeAgentPreviewUrl('http://127.0.0.1:3000/chat')).toBe(true);
      expect(isSafeAgentPreviewUrl('http://[::1]:3000/chat')).toBe(true);
    });

    it('treats loopback hostname matching case-insensitively (URL parser lowercases host)', () => {
      expect(isSafeAgentPreviewUrl('http://LOCALHOST:3000/chat')).toBe(true);
    });

    it('rejects a non-loopback http origin (https-only boundary outside documented loopback)', () => {
      expect(isSafeAgentPreviewUrl('http://example.invalid/chat')).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ area: 'AgentUrlPreview_BlockedDestination' }));
    });

    it('rejects executable/script schemes', () => {
      expect(isSafeAgentPreviewUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeAgentPreviewUrl('vbscript:MsgBox("x")')).toBe(false);
      expect(isSafeAgentPreviewUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeAgentPreviewUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects scheme smuggling via mixed case and embedded control characters (parsed, not string-prefix)', () => {
      // The URL parser normalizes case and strips embedded tab/newline control characters from the
      // scheme per the WHATWG URL spec, so these must still resolve to the disallowed `javascript:`
      // protocol -- a string-prefix check (e.g. startsWith('javascript:')) would miss all of these.
      expect(isSafeAgentPreviewUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeAgentPreviewUrl('JavaScript:alert(1)')).toBe(false);
      expect(isSafeAgentPreviewUrl('java\tscript:alert(1)')).toBe(false);
      expect(isSafeAgentPreviewUrl('java\nscript:alert(1)')).toBe(false);
      expect(isSafeAgentPreviewUrl('\u0000javascript:alert(1)')).toBe(false);
    });

    it('rejects malformed/unparseable values', () => {
      expect(isSafeAgentPreviewUrl('not-a-url')).toBe(false);
      expect(isSafeAgentPreviewUrl('//evil.example.invalid/chat')).toBe(false);
      expect(isSafeAgentPreviewUrl('   ')).toBe(false);
    });

    it('rejects absent metadata without throwing (undefined, empty string)', () => {
      expect(isSafeAgentPreviewUrl(undefined)).toBe(false);
      expect(isSafeAgentPreviewUrl('')).toBe(false);
      expect(mockLog).not.toHaveBeenCalled();
    });

    it('never logs the raw destination or any query string on rejection', () => {
      isSafeAgentPreviewUrl('javascript:alert(document.cookie)');
      for (const call of mockLog.mock.calls) {
        const serialized = JSON.stringify(call[0]);
        expect(serialized).not.toContain('document.cookie');
        expect(serialized).not.toContain('alert(');
      }
    });
  });
});
