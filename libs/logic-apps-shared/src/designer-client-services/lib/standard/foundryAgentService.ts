/**
 * Foundry Agent Service
 *
 * API client for listing and retrieving Azure AI Foundry v2 agents.
 * Uses the agent REST API exposed by Foundry projects.
 *
 * Endpoint pattern: https://{accountName}.services.ai.azure.com/api/projects/{projectName}
 */

const REQUEST_TIMEOUT = 30_000;
const FOUNDRY_API_VERSION = '2025-05-15-preview';

// =============================================================================
// TYPES
// =============================================================================

export interface FoundryToolDefinition {
  type: 'code_interpreter' | 'file_search' | 'function';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface FoundryAgentVersionDefinition {
  kind?: string;
  model?: string;
  instructions?: string;
  tools?: FoundryToolDefinition[];
}

interface FoundryAgentRaw {
  object: 'agent';
  id: string;
  name: string;
  versions?: {
    latest?: {
      metadata?: Record<string, string>;
      id?: string;
      name?: string;
      version?: string;
      description?: string;
      created_at?: number;
      definition?: FoundryAgentVersionDefinition;
    };
  };
}

export interface FoundryAgent {
  id: string;
  name: string | null;
  model: string;
  instructions: string | null;
  tools: FoundryToolDefinition[];
  metadata: Record<string, string>;
  created_at: number;
  object: 'agent';
  description: string | null;
}

export interface FoundryAgentListResponse {
  object: 'list';
  data: FoundryAgentRaw[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

export interface ListAgentsOptions {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string | undefined;
  before?: string | undefined;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeAgent(raw: FoundryAgentRaw): FoundryAgent {
  const latest = raw.versions?.latest;
  const def = latest?.definition;
  return {
    id: raw.id,
    name: raw.name ?? null,
    model: def?.model ?? '',
    instructions: def?.instructions ?? null,
    tools: def?.tools ?? [],
    metadata: latest?.metadata ?? {},
    created_at: latest?.created_at ?? 0,
    object: 'agent',
    description: latest?.description ?? null,
  };
}

async function foundryRequest<T>(accessToken: string, method: 'GET' | 'POST' | 'DELETE', url: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message ?? errorJson.message ?? errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Foundry API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Foundry API request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildAgentsUrl(projectEndpoint: string): string {
  let base = projectEndpoint.replace(/\/+$/, '');

  if (base.includes('.cognitiveservices.azure.com')) {
    base = base.replace('.cognitiveservices.azure.com', '.services.ai.azure.com');
  }

  return `${base}/agents?api-version=${FOUNDRY_API_VERSION}`;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Derive the Foundry project data-plane endpoint from the connection's ARM resource ID.
 *
 * Input:  /subscriptions/.../Microsoft.CognitiveServices/accounts/{account}/projects/{project}
 * Output: https://{account}.services.ai.azure.com/api/projects/{project}
 */
export function buildProjectEndpointFromResourceId(resourceId: string): string | undefined {
  const match = resourceId.match(/\/Microsoft\.CognitiveServices\/accounts\/([^/]+)\/projects\/([^/]+)/i);
  if (!match) {
    return undefined;
  }
  const [, accountName, projectName] = match;
  return `https://${accountName}.services.ai.azure.com/api/projects/${projectName}`;
}

/**
 * List v2 agents in a Foundry project.
 */
export async function listFoundryAgents(
  projectEndpoint: string,
  accessToken: string,
  options?: ListAgentsOptions
): Promise<FoundryAgentListResponse> {
  const url = new URL(buildAgentsUrl(projectEndpoint));

  if (options?.limit) {
    url.searchParams.set('limit', String(options.limit));
  }
  if (options?.order) {
    url.searchParams.set('order', options.order);
  }
  if (options?.after) {
    url.searchParams.set('after', options.after);
  }
  if (options?.before) {
    url.searchParams.set('before', options.before);
  }

  return foundryRequest<FoundryAgentListResponse>(accessToken, 'GET', url.toString());
}

/**
 * List ALL v2 agents in a Foundry project (auto-paginate).
 */
export async function listAllFoundryAgents(projectEndpoint: string, accessToken: string): Promise<FoundryAgent[]> {
  const agents: FoundryAgent[] = [];
  let after: string | undefined;

  while (true) {
    const page = await listFoundryAgents(projectEndpoint, accessToken, {
      limit: 100,
      after,
    });

    agents.push(...page.data.map(normalizeAgent));

    if (!page.has_more || !page.last_id) {
      break;
    }
    after = page.last_id;
  }

  return agents;
}

/**
 * Get a single Foundry v2 agent by ID.
 */
export async function getFoundryAgent(projectEndpoint: string, agentId: string, accessToken: string): Promise<FoundryAgent> {
  let base = projectEndpoint.replace(/\/+$/, '');
  if (base.includes('.cognitiveservices.azure.com')) {
    base = base.replace('.cognitiveservices.azure.com', '.services.ai.azure.com');
  }
  const url = `${base}/agents/${encodeURIComponent(agentId)}?api-version=${FOUNDRY_API_VERSION}`;

  const raw = await foundryRequest<FoundryAgentRaw>(accessToken, 'GET', url);
  return normalizeAgent(raw);
}
