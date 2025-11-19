import { AgentCardSchema } from '../types/schemas';
import type { AgentCard } from '../types';

export interface AgentDiscoveryOptions {
  cache?: boolean;
  cacheTTL?: number;
  apiKey?: string;
}

interface CacheEntry {
  agentCard: AgentCard;
  timestamp: number;
}

export class AgentDiscovery {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly options: AgentDiscoveryOptions;

  constructor(options: AgentDiscoveryOptions = {}) {
    this.options = {
      cache: true,
      cacheTTL: 3600000, // 1 hour default
      ...options,
    };
  }

  async fromWellKnownUri(domain: string): Promise<AgentCard> {
    // Clean up domain - remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    const url = `https://${cleanDomain}/.well-known/agent-card.json`;

    // Check cache
    if (this.options.cache) {
      const cached = this.getCached(url);
      if (cached) {
        return cached;
      }
    }

    // Fetch agent card
    const headers: HeadersInit = {};
    if (this.options.apiKey) {
      headers['X-API-Key'] = this.options.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch agent card: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = AgentCardSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid agent card: ${result.error.message}`);
    }

    // Cache the result
    if (this.options.cache) {
      this.cache.set(url, {
        agentCard: result.data,
        timestamp: Date.now(),
      });
    }

    return result.data;
  }

  async fromRegistry(registryUrl: string, agentId: string): Promise<AgentCard> {
    // Ensure registry URL doesn't have trailing slash
    const cleanRegistryUrl = registryUrl.replace(/\/$/, '');
    const url = `${cleanRegistryUrl}/agents/${agentId}`;

    // Check cache
    if (this.options.cache) {
      const cached = this.getCached(url);
      if (cached) {
        return cached;
      }
    }

    // Fetch from registry
    const headers: HeadersInit = {};
    if (this.options.apiKey) {
      headers['X-API-Key'] = this.options.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch agent card from registry: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const result = AgentCardSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid agent card: ${result.error.message}`);
    }

    // Cache the result
    if (this.options.cache) {
      this.cache.set(url, {
        agentCard: result.data,
        timestamp: Date.now(),
      });
    }

    return result.data;
  }

  async fromDirect(urlOrCard: string | AgentCard): Promise<AgentCard> {
    if (typeof urlOrCard === 'string') {
      // It's a URL, fetch it
      const url = urlOrCard;

      // Check cache
      if (this.options.cache) {
        const cached = this.getCached(url);
        if (cached) {
          return cached;
        }
      }

      const headers: HeadersInit = {};
      if (this.options.apiKey) {
        headers['X-API-Key'] = this.options.apiKey;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = AgentCardSchema.safeParse(data);

      if (!result.success) {
        throw new Error(`Invalid agent card: ${result.error.message}`);
      }

      // Cache the result
      if (this.options.cache) {
        this.cache.set(url, {
          agentCard: result.data,
          timestamp: Date.now(),
        });
      }

      return result.data;
    } else {
      // It's an inline agent card, validate it
      const result = AgentCardSchema.safeParse(urlOrCard);

      if (!result.success) {
        throw new Error(`Invalid agent card: ${result.error.message}`);
      }

      return result.data;
    }
  }

  getCached(identifier: string): AgentCard | null {
    if (!this.options.cache) {
      return null;
    }

    const entry = this.cache.get(identifier);
    if (!entry) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    const cacheTTL = this.options.cacheTTL ?? 3600000; // Default to 1 hour
    if (now - entry.timestamp > cacheTTL) {
      this.cache.delete(identifier);
      return null;
    }

    return entry.agentCard;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
