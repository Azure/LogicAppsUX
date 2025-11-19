import { AgentCardSchema } from '../types/schemas';
import type { AgentCard } from '../types';

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface AgentRegistry {
  name: string;
  searchAgents(query: string): Promise<AgentSummary[]>;
  getAgentCard(agentId: string): Promise<AgentCard>;
}

export class PublicAgentRegistry implements AgentRegistry {
  name = 'Public A2A Registry';

  constructor(private baseUrl: string) {}

  async searchAgents(query: string): Promise<AgentSummary[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search agents: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.agents || [];
  }

  async getAgentCard(agentId: string): Promise<AgentCard> {
    const url = `${this.baseUrl}/agents/${agentId}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent card: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = AgentCardSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid agent card from registry: ${result.error.message}`);
    }

    return result.data;
  }
}

export class EnterpriseAgentRegistry implements AgentRegistry {
  name = 'Enterprise Agent Registry';

  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async searchAgents(query: string): Promise<AgentSummary[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search agents: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.agents || [];
  }

  async getAgentCard(agentId: string): Promise<AgentCard> {
    const url = `${this.baseUrl}/agents/${agentId}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent card: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = AgentCardSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid agent card from registry: ${result.error.message}`);
    }

    return result.data;
  }
}
