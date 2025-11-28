import { describe, it, expect } from 'vitest';
import { AgentCardSchema } from './schemas';
import type { AgentCard } from './schemas';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

describe('AgentCard schema', () => {
  it('should validate a minimal agent card', () => {
    const minimalCard = getMockAgentCard();

    const result = AgentCardSchema.safeParse(minimalCard);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Agent');
      expect(result.data.url).toBe('https://api.test-agent.com');
      expect(result.data.protocolVersion).toBe('0.2.9');
    }
  });

  it('should validate a complete agent card with all fields', () => {
    const completeCard = getMockAgentCard({
      name: 'Advanced Agent',
      description: 'An advanced AI agent with multiple capabilities',
      version: '2.0.0',
      url: 'https://api.advanced-agent.com',
      provider: {
        organization: 'A2A Team',
        url: 'https://example.com',
      },
      iconUrl: 'https://example.com/icon.png',
      documentationUrl: 'https://docs.example.com',
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
        extensions: [],
      },
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
        },
      },
      security: [{ bearer: [] }],
      skills: [
        {
          id: 'text-gen',
          name: 'Text Generation',
          description: 'Generate text based on prompts',
          tags: ['text', 'generation'],
          examples: ['Generate a story about...'],
        },
      ],
      supportsAuthenticatedExtendedCard: true,
    });

    const result = AgentCardSchema.safeParse(completeCard);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Advanced Agent');
      expect(result.data.url).toBe('https://api.advanced-agent.com');
      expect(result.data.capabilities.streaming).toBe(true);
      expect(result.data.skills).toHaveLength(1);
    }
  });

  it('should reject agent card without required fields', () => {
    const invalidCard = {
      name: 'Invalid Agent',
      description: 'Missing required fields',
      // Missing url, version, capabilities, defaultInputModes, defaultOutputModes, skills
    };

    const result = AgentCardSchema.safeParse(invalidCard);

    expect(result.success).toBe(false);
    if (!result.success) {
      const missingFields = result.error.issues.map((issue) => issue.path.join('.'));
      expect(missingFields).toContain('protocolVersion');
      expect(missingFields).toContain('url');
      expect(missingFields).toContain('version');
      expect(missingFields).toContain('capabilities');
      expect(missingFields).toContain('defaultInputModes');
      expect(missingFields).toContain('defaultOutputModes');
      expect(missingFields).toContain('skills');
    }
  });

  it('should reject agent card with invalid service endpoint', () => {
    const invalidCard = getMockAgentCard({
      url: 'not-a-valid-url',
    });

    const result = AgentCardSchema.safeParse(invalidCard);

    expect(result.success).toBe(false);
    if (!result.success) {
      const urlIssue = result.error.issues.find((issue) => issue.path.includes('url'));
      expect(urlIssue).toBeDefined();
      expect(urlIssue?.code).toBe('invalid_format');
    }
  });

  it('should validate agent card with multiple skills', () => {
    const multiSkillCard = getMockAgentCard({
      skills: [
        {
          id: 'text-gen',
          name: 'Text Generation',
          description: 'Generate text',
          tags: ['text', 'generation'],
        },
        {
          id: 'code-gen',
          name: 'Code Generation',
          description: 'Generate code',
          tags: ['code', 'programming'],
          inputModes: ['text/plain'],
          outputModes: ['text/plain', 'application/javascript'],
        },
        {
          id: 'analysis',
          name: 'Data Analysis',
          description: 'Analyze data',
          tags: ['data', 'analysis'],
          examples: ['Analyze this CSV file...'],
        },
      ],
    });

    const result = AgentCardSchema.safeParse(multiSkillCard);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toHaveLength(3);
      expect(result.data.skills[0].id).toBe('text-gen');
      expect(result.data.skills[1].inputModes).toContain('text/plain');
    }
  });
});
