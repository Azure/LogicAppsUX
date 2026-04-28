import { SearchService } from '../search';
import { ConnectionService } from '../connection';
import type { DiscoveryOpArray, OpenAPIV2 } from '../../../utils/src';

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling format)
// ---------------------------------------------------------------------------

export interface CopilotToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; items?: { type: string } }>;
      required: string[];
    };
  };
}

export const COPILOT_WORKFLOW_TOOLS: CopilotToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'discover_connectors',
      description:
        'Search for available managed API connectors and their operations. Call this BEFORE creating ANY ApiConnection action. Returns complete, ready-to-use action definitions that you can copy directly into the workflow. Provide descriptions of the capabilities you need and this tool will return the matching operations with their full action templates.',
      parameters: {
        type: 'object',
        properties: {
          capabilities: {
            type: 'array',
            description:
              'Array of capability descriptions to search for. Each description should describe what you want to do (e.g. "send an email via outlook", "get rows from a sql table", "post a message to teams channel")',
            items: {
              type: 'string',
            },
          },
        },
        required: ['capabilities'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_connector_operations',
      description:
        'List all available operations for a specific connector by ID. Use this when you already know the connector ID (e.g. from the workflow connectionReferences) and want to see all operations it supports. Returns complete action templates for each operation.',
      parameters: {
        type: 'object',
        properties: {
          connectorId: {
            type: 'string',
            description: 'The connector ID (e.g. from the workflow connectionReferences or from a previous discover_connectors result)',
          },
        },
        required: ['connectorId'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

export async function executeCopilotTool(toolName: string, rawArgs: string): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return JSON.stringify({ error: 'Invalid JSON arguments' });
  }

  switch (toolName) {
    case 'discover_connectors':
      return discoverConnectors(args['capabilities'] as string[] | undefined);
    case 'get_connector_operations':
      return getConnectorOperations(String(args['connectorId'] ?? ''));
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// Individual tool handlers
// ---------------------------------------------------------------------------

/**
 * Discovers connectors and operations matching the given capability descriptions.
 * Returns complete, ready-to-use action templates for each matched operation.
 */
async function discoverConnectors(capabilities: string[] | undefined): Promise<string> {
  if (!capabilities || capabilities.length === 0) {
    return JSON.stringify({ error: 'Please provide at least one capability description' });
  }

  try {
    const searchService = SearchService();
    const connectionService = ConnectionService();
    const results: Record<string, unknown> = {};

    for (const capability of capabilities) {
      let operations: DiscoveryOpArray = [];

      if (searchService.getActiveSearchOperations) {
        operations = await searchService.getActiveSearchOperations(capability);
      } else {
        const allOps = await searchService.getAllOperations();
        const term = capability.toLowerCase();
        operations = allOps.filter((op) => {
          const summary = op.properties?.summary?.toLowerCase() ?? '';
          const description = op.properties?.description?.toLowerCase() ?? '';
          const name = op.name?.toLowerCase() ?? '';
          return summary.includes(term) || description.includes(term) || name.includes(term);
        });
      }

      if (!operations || operations.length === 0) {
        results[capability] = { message: `No operations found for "${capability}"` };
        continue;
      }

      // Get the top matches and build complete action templates
      const topOps = operations.slice(0, 5);
      const actionTemplates: unknown[] = [];

      // Group by connector to batch swagger lookups
      const byConnector = new Map<string, typeof topOps>();
      for (const op of topOps) {
        const api = (op.properties as any)?.api;
        const connId = api?.id ?? '';
        if (!byConnector.has(connId)) {
          byConnector.set(connId, []);
        }
        byConnector.get(connId)?.push(op);
      }

      for (const [connId, ops] of byConnector.entries()) {
        let swagger: OpenAPIV2.Document | null = null;
        try {
          swagger = connId ? await connectionService.getSwaggerFromConnector(connId) : null;
        } catch {
          // Swagger not available — still return operation info without action template
        }

        for (const op of ops) {
          const api = (op.properties as any)?.api;
          const swaggerOpId = (op.properties as any)?.swaggerOperationId ?? op.name;

          const swaggerOp = swagger ? findSwaggerOperation(swagger, swaggerOpId) : null;

          if (swaggerOp) {
            actionTemplates.push(buildActionTemplate(op, swaggerOp, api));
          } else {
            // Return basic info without a full action template
            actionTemplates.push({
              operationId: op.name,
              connectorId: connId,
              connectorName: api?.displayName ?? api?.name,
              summary: op.properties?.summary,
              description: op.properties?.description,
              note: swagger ? 'Operation not found in swagger — use a different operationId' : 'Swagger not available for this connector',
            });
          }
        }
      }

      results[capability] = actionTemplates;
    }

    return JSON.stringify(results);
  } catch (error) {
    return JSON.stringify({ error: `Discovery failed: ${error instanceof Error ? error.message : String(error)}` });
  }
}

/**
 * Lists all operations for a specific connector and returns complete action templates.
 */
async function getConnectorOperations(connectorId: string): Promise<string> {
  try {
    const searchService = SearchService();
    const connectionService = ConnectionService();

    let operations: DiscoveryOpArray = [];

    if (searchService.getOperationsByConnector) {
      operations = await searchService.getOperationsByConnector(connectorId);
    } else {
      const allOps = await searchService.getAllOperations();
      operations = allOps.filter((op) => {
        const api = (op.properties as any)?.api;
        return api?.id?.toLowerCase() === connectorId.toLowerCase();
      });
    }

    if (!operations || operations.length === 0) {
      return JSON.stringify({ results: [], message: `No operations found for connector "${connectorId}"` });
    }

    let swagger: OpenAPIV2.Document | null = null;
    try {
      swagger = await connectionService.getSwaggerFromConnector(connectorId);
    } catch {
      // Continue without swagger
    }

    const actionTemplates = operations.map((op) => {
      const api = (op.properties as any)?.api;
      const swaggerOpId = (op.properties as any)?.swaggerOperationId ?? op.name;
      const swaggerOp = swagger ? findSwaggerOperation(swagger, swaggerOpId) : null;

      if (swaggerOp) {
        return buildActionTemplate(op, swaggerOp, api);
      }

      return {
        operationId: op.name,
        connectorName: api?.displayName ?? api?.name,
        summary: op.properties?.summary,
        description: op.properties?.description,
      };
    });

    return JSON.stringify({ results: actionTemplates });
  } catch (error) {
    return JSON.stringify({ error: `Failed to list operations: ${error instanceof Error ? error.message : String(error)}` });
  }
}

// ---------------------------------------------------------------------------
// Action template builder
// ---------------------------------------------------------------------------

interface ActionTemplate {
  operationId: string;
  connectorId: string;
  connectorName: string;
  summary: string;
  description: string;
  /** A complete, ready-to-use action definition — copy this directly into the workflow */
  actionDefinition: {
    type: string;
    inputs: {
      host: { connection: { referenceName: string } };
      method: string;
      path: string;
      body?: Record<string, string>;
      queries?: Record<string, string>;
      headers?: Record<string, string>;
    };
  };
  /** Description of each input field for the body/queries */
  inputDescriptions?: Record<string, string>;
}

/**
 * Builds a complete, ready-to-use ApiConnection action definition from swagger operation data.
 * The LLM can copy this directly into the workflow and only fill in the actual values.
 */
function buildActionTemplate(op: DiscoveryOpArray[number], swaggerOp: SwaggerOperationInfo, api: any): ActionTemplate {
  const connectorName = api?.displayName ?? api?.name ?? 'unknown';
  // Derive a reasonable connection reference name from the connector
  const referenceName = deriveReferenceName(connectorName);

  // Strip the {connectionId} prefix — it's handled by the connection reference, not the path.
  // Swagger paths come as "/{connectionId}/v3/beta/teams/{groupId}/..." but the serialized
  // workflow path should be "/v3/beta/teams/@{encodeURIComponent('<groupId>')}/..."
  let processedPath = swaggerOp.path.replace(/^\/?\{connectionId\}/, '');
  if (!processedPath.startsWith('/')) {
    processedPath = `/${processedPath}`;
  }

  const inputDescriptions: Record<string, string> = {};

  // Extract path parameters and replace {paramName} with @{encodeURIComponent('<paramName>')}
  // Also add them to inputDescriptions so the LLM knows what to fill in
  const pathParams = swaggerOp.parameters?.filter((p) => p.in === 'path') ?? [];
  for (const param of pathParams) {
    // Skip connectionId — already stripped above
    if (param.name.toLowerCase() === 'connectionid') {
      continue;
    }
    const placeholder = `@{encodeURIComponent('${param.description || param.name}')}`;
    processedPath = processedPath.replace(`{${param.name}}`, placeholder);
    if (param.description) {
      inputDescriptions[`path.${param.name}`] = param.description;
    }
  }

  // Fallback: replace any remaining {paramName} tokens that weren't in the parameter list
  processedPath = processedPath.replace(/\{([^}]+)\}/g, (_match, paramName) => {
    return `@{encodeURIComponent('${paramName}')}`;
  });

  const inputs: ActionTemplate['actionDefinition']['inputs'] = {
    host: { connection: { referenceName } },
    method: swaggerOp.method.toLowerCase(),
    path: processedPath,
  };

  // Build body template from swagger body parameters
  if (swaggerOp.requestBody) {
    const bodyTemplate: Record<string, string> = {};
    const bodySchema = swaggerOp.requestBody as any;

    if (bodySchema.properties && typeof bodySchema.properties === 'object') {
      for (const [propName, propDef] of Object.entries(bodySchema.properties)) {
        const def = propDef as any;
        bodyTemplate[propName] = `<${def.type ?? 'string'}>`;
        if (def.description || def['x-ms-summary']) {
          inputDescriptions[`body.${propName}`] = def.description || def['x-ms-summary'];
        }
      }
    }

    if (Object.keys(bodyTemplate).length > 0) {
      inputs.body = bodyTemplate;
    }
  }

  // Build query parameters template
  const queryParams = swaggerOp.parameters?.filter((p) => p.in === 'query') ?? [];
  if (queryParams.length > 0) {
    const queries: Record<string, string> = {};
    for (const param of queryParams) {
      queries[param.name] = `<${param.type ?? 'string'}>`;
      if (param.description) {
        inputDescriptions[`queries.${param.name}`] = param.description;
      }
    }
    inputs.queries = queries;
  }

  // Build header parameters template
  const headerParams = swaggerOp.parameters?.filter((p) => p.in === 'header') ?? [];
  if (headerParams.length > 0) {
    const headers: Record<string, string> = {};
    for (const param of headerParams) {
      headers[param.name] = `<${param.type ?? 'string'}>`;
      if (param.description) {
        inputDescriptions[`headers.${param.name}`] = param.description;
      }
    }
    inputs.headers = headers;
  }

  return {
    operationId: swaggerOp.operationId,
    connectorId: api?.id ?? '',
    connectorName,
    summary: op.properties?.summary ?? swaggerOp.summary ?? '',
    description: op.properties?.description ?? swaggerOp.description ?? '',
    actionDefinition: {
      type: 'ApiConnection',
      inputs,
    },
    inputDescriptions: Object.keys(inputDescriptions).length > 0 ? inputDescriptions : undefined,
  };
}

/**
 * Derives a connection reference name from a connector display name.
 * e.g. "Office 365 Outlook" -> "office365"
 * e.g. "SQL Server" -> "sql"
 * e.g. "SharePoint" -> "sharepoint"
 */
function deriveReferenceName(connectorName: string): string {
  return (
    connectorName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(microsoft|azure)/, '')
      .substring(0, 30) || 'connection'
  );
}

// ---------------------------------------------------------------------------
// Swagger helpers
// ---------------------------------------------------------------------------

interface SwaggerOperationInfo {
  operationId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: SwaggerParameterInfo[];
  requestBody?: unknown;
}

interface SwaggerParameterInfo {
  name: string;
  in: string;
  required?: boolean;
  type?: string;
  description?: string;
  schema?: unknown;
}

/**
 * Searches through a swagger document to find an operation by its operationId.
 */
function findSwaggerOperation(swagger: OpenAPIV2.Document, operationId: string): SwaggerOperationInfo | null {
  const paths = swagger.paths;
  if (!paths) {
    return null;
  }

  const targetId = operationId.toLowerCase();

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    for (const method of methods) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') {
        continue;
      }

      const opId = (operation.operationId as string) ?? '';
      if (opId.toLowerCase() !== targetId) {
        continue;
      }

      // Merge path-item-level parameters with operation-level parameters.
      // In OpenAPI v2, path parameters (like {groupId}) are often defined on the
      // pathItem rather than repeated on each operation.
      const pathItemParams = (Array.isArray((pathItem as any).parameters) ? (pathItem as any).parameters : []) as any[];
      const operationParams = (Array.isArray(operation.parameters) ? operation.parameters : []) as any[];
      // Operation params override path-item params with the same name+in
      const mergedParamMap = new Map<string, any>();
      for (const p of pathItemParams) {
        mergedParamMap.set(`${p.in}:${p.name}`, p);
      }
      for (const p of operationParams) {
        mergedParamMap.set(`${p.in}:${p.name}`, p);
      }
      const params = Array.from(mergedParamMap.values());
      const parameterInfos: SwaggerParameterInfo[] = [];
      let requestBody: unknown = undefined;

      for (const param of params) {
        if (param.in === 'body') {
          requestBody = param.schema ?? param;
        } else {
          parameterInfos.push({
            name: param.name,
            in: param.in,
            required: param.required,
            type: param.type,
            description: param.description ?? (param as any)['x-ms-summary'],
            schema: param.schema,
          });
        }
      }

      return {
        operationId: opId,
        path: pathKey,
        method: method.toUpperCase(),
        summary: operation.summary,
        description: operation.description,
        parameters: parameterInfos.length > 0 ? parameterInfos : undefined,
        requestBody: requestBody ?? undefined,
      };
    }
  }

  return null;
}
