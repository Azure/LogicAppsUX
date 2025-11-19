import type { AgentCard } from '../types';

export function getMockAgentCard(overrides: Partial<AgentCard> = {}): AgentCard {
  return {
    protocolVersion: '0.2.9',
    name: 'Test Agent',
    description: 'A test agent',
    version: '1.0.0',
    url: 'https://api.test-agent.com',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
      extensions: [],
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: [],
    ...overrides,
  };
}
