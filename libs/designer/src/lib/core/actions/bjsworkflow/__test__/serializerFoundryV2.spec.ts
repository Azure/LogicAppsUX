import { describe, it, expect } from 'vitest';

/**
 * Standalone unit tests for the Foundry V2 system-message stripping logic
 * applied in serializeManifestBasedOperation. We test the filtering predicate
 * directly to avoid wiring up the full Redux store / manifest resolution.
 */

/** Mirrors the inline filter from serializer.ts (FoundryAgentServiceV2 path). */
function stripSystemMessagesForV2(
  agentModelType: string | undefined,
  messages: Array<{ role?: string; content?: string }> | undefined
): Array<{ role?: string; content?: string }> | undefined {
  if (agentModelType === 'FoundryAgentServiceV2' && Array.isArray(messages)) {
    return messages.filter((msg) => msg.role?.toLowerCase() !== 'system');
  }
  return messages;
}

describe('Foundry V2 system message stripping', () => {
  const messagesWithSystem = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' },
    { role: 'user', content: 'How are you?' },
  ];

  it('strips system messages when agentModelType is FoundryAgentServiceV2', () => {
    const result = stripSystemMessagesForV2('FoundryAgentServiceV2', messagesWithSystem);
    expect(result).toHaveLength(2);
    expect(result?.every((m) => m.role !== 'system')).toBe(true);
  });

  it('preserves user messages when stripping system messages', () => {
    const result = stripSystemMessagesForV2('FoundryAgentServiceV2', messagesWithSystem);
    expect(result).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'user', content: 'How are you?' },
    ]);
  });

  it('handles case-insensitive role matching (System, SYSTEM)', () => {
    const mixed = [
      { role: 'System', content: 'a' },
      { role: 'SYSTEM', content: 'b' },
      { role: 'user', content: 'c' },
    ];
    const result = stripSystemMessagesForV2('FoundryAgentServiceV2', mixed);
    expect(result).toEqual([{ role: 'user', content: 'c' }]);
  });

  it('does NOT strip system messages for AzureOpenAI', () => {
    const result = stripSystemMessagesForV2('AzureOpenAI', messagesWithSystem);
    expect(result).toEqual(messagesWithSystem);
  });

  it('does NOT strip system messages for V1ChatCompletionsService', () => {
    const result = stripSystemMessagesForV2('V1ChatCompletionsService', messagesWithSystem);
    expect(result).toEqual(messagesWithSystem);
  });

  it('does NOT strip system messages for MicrosoftFoundry', () => {
    const result = stripSystemMessagesForV2('MicrosoftFoundry', messagesWithSystem);
    expect(result).toEqual(messagesWithSystem);
  });

  it('returns undefined when messages is undefined', () => {
    const result = stripSystemMessagesForV2('FoundryAgentServiceV2', undefined);
    expect(result).toBeUndefined();
  });

  it('returns empty array when all messages are system for V2', () => {
    const onlySystem = [{ role: 'system', content: 'a' }];
    const result = stripSystemMessagesForV2('FoundryAgentServiceV2', onlySystem);
    expect(result).toEqual([]);
  });

  it('returns messages unchanged when agentModelType is undefined', () => {
    const result = stripSystemMessagesForV2(undefined, messagesWithSystem);
    expect(result).toEqual(messagesWithSystem);
  });
});
