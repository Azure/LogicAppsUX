import { initializeOperationDetailsForManagedMcpServer, initializeOutputTokensForOperations } from '../operationdeserializer';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { getConnectorWithSwagger } from '../../../queries/connections';
import { getOperationManifest } from '../../../queries/operation';
import type { WorkflowNode } from '../../../parsers/models/workflowNode';
import type { NodesMetadata, Operations } from '../../../state/workflow/workflowInterfaces';

vi.mock('../../../queries/connections', () => ({
  getConnectorWithSwagger: vi.fn(),
}));

vi.mock('../../../queries/operation', () => ({
  getOperationManifest: vi.fn(),
  getOperationInfo: vi.fn(),
}));

// Mock initialize functions that are called for parameter processing
vi.mock('../initialize', () => ({
  getInputParametersFromManifest: vi.fn(() => ({
    inputs: {},
    dependencies: {},
  })),
  getOutputParametersFromManifest: vi.fn(() => ({
    outputs: {},
    dependencies: {},
  })),
}));

vi.mock('../settings', () => ({
  getOperationSettings: vi.fn(() => ({})),
}));

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    LoggerService: vi.fn(() => ({
      log: vi.fn(),
    })),
  };
});

const mockGetConnectorWithSwagger = vi.mocked(getConnectorWithSwagger);
const mockGetOperationManifest = vi.mocked(getOperationManifest);

describe('operationdeserializer', () => {
  describe('initializeOperationDetailsForManagedMcpServer', () => {
    const mockDispatch = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();

      mockGetConnectorWithSwagger.mockResolvedValue({
        connector: {
          id: '/connectors/mcpclient',
          name: 'mcpclient',
          type: 'Microsoft.Web/connections',
          properties: {
            displayName: 'MCP Client',
            iconUri: 'https://example.com/icon.png',
            brandColor: '#0078d4',
            connectionParameters: {},
            runtimeUrls: ['https://example.com/runtime'],
            swagger: {
              swagger: '2.0',
              info: { title: 'MCP Client', version: '1.0' },
              host: 'example.com',
              basePath: '/',
              schemes: ['https'],
              paths: {
                '/servers/filesystem': {
                  post: {
                    operationId: 'test-operation',
                    summary: 'File operations',
                    parameters: [],
                    responses: {},
                  },
                },
              },
            },
          },
        } as any,
        parsedSwagger: {
          getOperations: () => ({
            'test-operation': {
              operationId: 'test-operation',
              path: '/servers/filesystem',
              method: 'POST',
              summary: 'File operations',
            },
          }),
        } as any,
      });

      mockGetOperationManifest.mockResolvedValue({
        properties: {
          iconUri: 'https://example.com/icon.png',
          brandColor: '#0078d4',
          inputs: {
            properties: {
              toolName: { type: 'string', title: 'Tool Name' },
              parameters: { type: 'object', title: 'Parameters' },
            },
          },
          outputs: {
            properties: {
              result: { type: 'object', title: 'Result' },
            },
          },
        },
      } as any);
    });

    it('should handle missing connection reference gracefully', async () => {
      const nodeId = 'test-mcp-node';
      const operation = {
        type: 'McpClientTool',
        kind: 'Managed',
        inputs: {
          connectionReference: {
            connectionName: 'missing-connection',
          },
          parameters: {
            mcpServerPath: '/servers/filesystem',
          },
        },
      };
      const references = {};
      const workflowKind = 'agent';

      const result = await initializeOperationDetailsForManagedMcpServer(nodeId, operation, references, workflowKind, mockDispatch);

      expect(result).toBeUndefined();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operationMetadata/updateErrorDetails',
          payload: expect.objectContaining({
            id: 'test-mcp-node',
            errorInfo: expect.objectContaining({
              message: expect.stringMatching(/Incomplete information for operation/),
            }),
          }),
        })
      );
    });

    it('should handle missing mcpServerPath parameter', async () => {
      const nodeId = 'test-mcp-node';
      const operation = {
        type: 'McpClientTool',
        kind: 'Managed',
        inputs: {
          connectionReference: {
            connectionName: 'mcp-connection',
          },
          parameters: {},
        },
      };
      const references = {
        'mcp-connection': {
          api: {
            id: '/connectors/mcpclient',
          },
          connection: {
            id: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/connections/mcp-connection',
          },
        },
      };
      const workflowKind = 'agent';

      const result = await initializeOperationDetailsForManagedMcpServer(nodeId, operation, references, workflowKind, mockDispatch);

      expect(result).toBeUndefined();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operationMetadata/updateErrorDetails',
          payload: expect.objectContaining({
            id: 'test-mcp-node',
            errorInfo: expect.objectContaining({
              message: expect.stringMatching(/Could not fetch operation input info from swagger and definition/),
            }),
          }),
        })
      );
    });

    it('should successfully process MCP operation with comprehensive mocking', async () => {
      const nodeId = 'test-mcp-node';
      const operation = {
        type: 'McpClientTool',
        kind: 'Managed',
        inputs: {
          connectionReference: {
            connectionName: 'mcp-connection',
          },
          parameters: {
            mcpServerPath: '/servers/filesystem',
            toolName: 'list_files',
            userParam1: 'value1',
            userParam2: 'value2',
          },
        },
      };
      const references = {
        'mcp-connection': {
          api: {
            id: '/connectors/mcpclient',
          },
          connection: {
            id: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/connections/mcp-connection',
          },
        },
      };
      const workflowKind = 'agent';

      const result = await initializeOperationDetailsForManagedMcpServer(nodeId, operation, references, workflowKind, mockDispatch);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);

      const nodeData = result![0];
      expect(nodeData).toEqual({
        id: nodeId,
        nodeInputs: expect.any(Object),
        nodeOutputs: expect.any(Object),
        nodeDependencies: expect.objectContaining({
          inputs: expect.any(Object),
          outputs: expect.any(Object),
        }),
        operationMetadata: expect.objectContaining({
          brandColor: expect.any(String),
          iconUri: expect.any(String),
        }),
        settings: expect.any(Object),
        staticResult: undefined,
      });

      expect(nodeData.id).toBe(nodeId);
      expect(nodeData.nodeInputs).toEqual({});
      expect(nodeData.nodeOutputs).toEqual({});
      expect(nodeData.nodeDependencies.inputs).toEqual({});
      expect(nodeData.nodeDependencies.outputs).toEqual({});
      expect(nodeData.settings).toEqual({});

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operationMetadata/initializeOperationInfo',
          payload: expect.objectContaining({
            id: nodeId,
            connectorId: '/connectors/mcpclient',
            operationId: 'test-operation',
            type: 'McpClientTool',
            kind: 'Managed',
            operationPath: '/servers/filesystem',
          }),
        })
      );

      expect(mockGetConnectorWithSwagger).toHaveBeenCalledWith(expect.stringContaining('mcpclient'));

      expect(mockGetOperationManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connectionProviders/mcpclient',
          operationId: 'nativemcpclient',
          type: 'McpClientTool',
          kind: 'Builtin',
        })
      );
    });
  });
});

// Regression coverage for a scope-paste bug where a pasted node's upstreamNodeIds
// omitted every id that lived outside the pasted fragment. In particular, the
// paste-site's InitializeVariable node was dropped, which left the SetVariable
// "Name" dropdown empty because getAvailableVariables filters variables by the
// current node's upstream slice. The fix threads the paste-site upstream ids
// through initializeOperationMetadata into initializeOutputTokensForOperations
// so every pasted op picks them up.
//
// The function is verified indirectly: with empty allNodesData it silently catches
// per-op errors and still returns a NodeTokens entry for each op containing the
// passed-in existingOutputTokens appended to whatever getTokenNodeIds computed.

describe('initializeOutputTokensForOperations - existingOutputTokens plumbing', () => {
  const graph: WorkflowNode = {
    id: 'root',
    type: 'GRAPH_NODE',
    children: [],
    edges: [],
  } as unknown as WorkflowNode;

  const nodesMetadata: NodesMetadata = {
    op1: { graphId: 'root' },
    op2: { graphId: 'root' },
  } as NodesMetadata;

  const operations: Operations = {
    op1: { type: 'Http' },
    op2: { type: 'Compose' },
  } as unknown as Operations;

  it('appends every id in existingOutputTokens to each op upstreamNodeIds', () => {
    const result = initializeOutputTokensForOperations(/* allNodesData */ [], operations, graph, nodesMetadata, ['initVarId', 'triggerId']);

    expect(Object.keys(result).sort()).toEqual(['op1', 'op2']);
    for (const opId of ['op1', 'op2']) {
      expect(result[opId].upstreamNodeIds).toEqual(expect.arrayContaining(['initVarId', 'triggerId']));
    }
  });

  it('defaults existingOutputTokens to [] when not provided', () => {
    const result = initializeOutputTokensForOperations(/* allNodesData */ [], operations, graph, nodesMetadata);

    for (const opId of ['op1', 'op2']) {
      // With no fragment predecessors and no existingOutputTokens, upstream is empty.
      expect(result[opId].upstreamNodeIds).toEqual([]);
    }
  });
});
