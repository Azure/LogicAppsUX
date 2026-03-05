/**
 * Foundry Agent Service
 *
 * API client for listing and retrieving Azure AI Foundry v2 agents.
 * Uses the agent REST API exposed by Foundry projects.
 * Delegates HTTP calls to the shared IHttpClient for consistent retry,
 * error handling, and request patterns across the codebase.
 *
 * Endpoint pattern: https://{accountName}.services.ai.azure.com/api/projects/{projectName}
 */

import type { IHttpClient, QueryParameters } from '../httpClient';

const FOUNDRY_API_VERSION = '2025-05-15-preview';
const FOUNDRY_PORTAL_VERSIONS_URI = 'https://ai.azure.com/nextgen/api/query?getAgentVersionsResolver';

// --- Types ---

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

export interface FoundryAgentVersion {
  id: string;
  name: string;
  version: string;
  description: string;
  created_at: number;
  metadata: Record<string, string>;
  object: 'agent.version';
  definition: FoundryAgentVersionDefinition;
}

export interface FoundryAgentVersionListResponse {
  object: 'list';
  data: FoundryAgentVersion[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

export interface ListAgentsOptions {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

// --- Helpers ---

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

/** Normalize the project endpoint to the Foundry data-plane host. */
function normalizeEndpoint(projectEndpoint: string): string {
  let base = projectEndpoint;
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  try {
    const url = new URL(base);
    if (url.hostname.endsWith('.cognitiveservices.azure.com')) {
      url.hostname = url.hostname.replace('.cognitiveservices.azure.com', '.services.ai.azure.com');
      let result = url.toString();
      while (result.endsWith('/')) {
        result = result.slice(0, -1);
      }
      return result;
    }
  } catch {
    // Not a valid URL — fall through and return as-is
  }
  return base;
}

function buildAgentsUri(projectEndpoint: string): string {
  return `${normalizeEndpoint(projectEndpoint)}/agents`;
}

function buildAgentUri(projectEndpoint: string, agentId: string): string {
  return `${normalizeEndpoint(projectEndpoint)}/agents/${encodeURIComponent(agentId)}`;
}

function foundryHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

// --- API Functions ---

/**
 * Derive the Foundry project data-plane endpoint from the connection's ARM resource ID.
 *
 * Input:  /subscriptions/.../Microsoft.CognitiveServices/accounts/{account}/projects/{project}
 * Output: https://{account}.services.ai.azure.com/api/projects/{project}
 */
export function buildProjectEndpointFromResourceId(resourceId: string): string | undefined {
  // Use non-greedy match to avoid polynomial backtracking
  const match = resourceId.match(/\/Microsoft\.CognitiveServices\/accounts\/([^/]+)\/projects\/([^/]+)(?:\/|$)/i);
  if (!match) {
    return undefined;
  }
  const [, accountName, projectName] = match;
  return `https://${accountName}.services.ai.azure.com/api/projects/${projectName}`;
}

/** List v2 agents in a Foundry project. */
export async function listFoundryAgents(
  httpClient: IHttpClient,
  projectEndpoint: string,
  accessToken: string,
  options?: ListAgentsOptions
): Promise<FoundryAgentListResponse> {
  const queryParameters: QueryParameters = {
    'api-version': FOUNDRY_API_VERSION,
    ...(options?.limit != null && { limit: options.limit }),
    ...(options?.order != null && { order: options.order }),
    ...(options?.after != null && { after: options.after }),
    ...(options?.before != null && { before: options.before }),
  };

  return httpClient.get<FoundryAgentListResponse>({
    uri: buildAgentsUri(projectEndpoint),
    headers: foundryHeaders(accessToken),
    queryParameters,
    noAuth: true,
  });
}

/** List ALL v2 agents in a Foundry project (auto-paginate). */
export async function listAllFoundryAgents(httpClient: IHttpClient, projectEndpoint: string, accessToken: string): Promise<FoundryAgent[]> {
  const agents: FoundryAgent[] = [];
  let after: string | undefined;

  while (true) {
    const page = await listFoundryAgents(httpClient, projectEndpoint, accessToken, { limit: 100, after });

    agents.push(...page.data.map(normalizeAgent));

    if (!page.has_more || !page.last_id) {
      break;
    }
    after = page.last_id;
  }

  return agents;
}

/** Get a single Foundry v2 agent by ID. */
export async function getFoundryAgent(
  httpClient: IHttpClient,
  projectEndpoint: string,
  agentId: string,
  accessToken: string
): Promise<FoundryAgent> {
  const raw = await httpClient.get<FoundryAgentRaw>({
    uri: buildAgentUri(projectEndpoint, agentId),
    headers: foundryHeaders(accessToken),
    queryParameters: { 'api-version': FOUNDRY_API_VERSION },
    noAuth: true,
  });
  return normalizeAgent(raw);
}

// --- Agent Versions ---

/**
 * List all versions of a Foundry agent.
 * Tries the data-plane endpoint first (`GET /agents/{id}/versions`).
 * Falls back to the Foundry Portal BFF if the data-plane returns 404.
 */
export async function listFoundryAgentVersions(
  httpClient: IHttpClient,
  projectEndpoint: string,
  agentId: string,
  accessToken: string,
  projectResourceId?: string
): Promise<FoundryAgentVersion[]> {
  // Try data-plane endpoint first
  try {
    const response = await httpClient.get<FoundryAgentVersionListResponse>({
      uri: `${buildAgentUri(projectEndpoint, agentId)}/versions`,
      headers: foundryHeaders(accessToken),
      queryParameters: { 'api-version': FOUNDRY_API_VERSION },
      noAuth: true,
    });
    const versions = extractVersionsData(response);
    if (versions.length) {
      return versions;
    }
    // Data-plane returned empty — fall through to portal BFF
  } catch {
    // Data-plane endpoint may not exist — fall through to portal API
  }

  // Fallback: Foundry Portal BFF
  if (!projectResourceId) {
    return [];
  }

  try {
    const response = await httpClient.post<FoundryAgentVersionListResponse, Record<string, unknown>>({
      uri: FOUNDRY_PORTAL_VERSIONS_URI,
      headers: foundryHeaders(accessToken),
      content: {
        query: 'getAgentVersionsResolver',
        params: {
          resourceId: projectResourceId,
          agentName: agentId,
          useFoundryV2: false,
        },
      },
      noAuth: true,
    });
    return extractVersionsData(response);
  } catch (error) {
    console.warn('[FoundryAgentService] Portal BFF versions call failed:', error);
    return [];
  }
}

/** Safely extract the versions array from an API response, handling nested or flat shapes. */
function extractVersionsData(response: unknown): FoundryAgentVersion[] {
  if (Array.isArray(response)) {
    return response as FoundryAgentVersion[];
  }
  if (!response || typeof response !== 'object') {
    return [];
  }

  const resp = response as Record<string, unknown>;

  // Standard shape: { data: [...] }
  if (Array.isArray(resp['data'])) {
    return resp['data'] as FoundryAgentVersion[];
  }

  // Wrapped shape: { result: { data: [...] } }
  const result = resp['result'] as Record<string, unknown> | undefined;
  if (Array.isArray(result?.['data'])) {
    return result['data'] as FoundryAgentVersion[];
  }

  return [];
}

// --- Update Agent ---

export interface UpdateFoundryAgentOptions {
  model?: string;
  instructions?: string;
  name?: string;
  description?: string;
}

/**
 * Update a Foundry v2 agent's model, instructions, or other properties.
 * Uses POST /agents/{agentId} for partial updates.
 */
export async function updateFoundryAgent(
  httpClient: IHttpClient,
  projectEndpoint: string,
  agentId: string,
  accessToken: string,
  updates: UpdateFoundryAgentOptions
): Promise<FoundryAgent> {
  const definition: Record<string, unknown> = {
    kind: 'prompt',
    ...(updates.model !== undefined && { model: updates.model }),
    ...(updates.instructions !== undefined && { instructions: updates.instructions }),
  };

  const body: Record<string, unknown> = {
    definition,
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.description !== undefined && { description: updates.description }),
  };

  const raw = await httpClient.post<FoundryAgentRaw, Record<string, unknown>>({
    uri: buildAgentUri(projectEndpoint, agentId),
    headers: foundryHeaders(accessToken),
    queryParameters: { 'api-version': FOUNDRY_API_VERSION },
    content: body,
    noAuth: true,
  });
  return normalizeAgent(raw);
}

// --- List Models ---

export interface FoundryModel {
  id: string;
  name: string;
}

interface FoundryModelDeployment {
  name: string;
  properties?: {
    model?: { name?: string; format?: string; version?: string };
  };
  model_name?: string;
  model_version?: string;
}

interface FoundryModelDeploymentListResponse {
  value?: FoundryModelDeployment[];
  data?: FoundryModelDeployment[];
}

/** List available model deployments for a Foundry project. */
export async function listFoundryModels(httpClient: IHttpClient, projectEndpoint: string, accessToken: string): Promise<FoundryModel[]> {
  const response = await httpClient.get<FoundryModelDeploymentListResponse>({
    uri: `${normalizeEndpoint(projectEndpoint)}/deployments`,
    headers: foundryHeaders(accessToken),
    queryParameters: { 'api-version': FOUNDRY_API_VERSION },
    noAuth: true,
  });
  const deployments = response.value ?? response.data ?? [];

  return deployments
    .filter((d) => d.name)
    .map((d) => ({
      id: d.name,
      name: d.properties?.model?.name ?? d.model_name ?? d.name,
    }));
}
