import { initializeConnectorOperationDetails } from '../agent';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { SearchService } from '@microsoft/logic-apps-shared';

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    LoggerService: vi.fn(() => ({
      log: vi.fn(),
      startTrace: vi.fn(),
      endTrace: vi.fn(),
    })),
    SearchService: vi.fn(),
  };
});

const mockSearchService = vi.mocked(SearchService);

describe('agent - initializeConnectorOperationDetails', () => {
  const mockDispatch = vi.fn();
  const workflowKind = 'agent' as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw and marks the node with a critical error when getAllConnectors rejects (issue #9223)', async () => {
    // Simulate the Standard-only API returning a 400 for a Consumption app.
    mockSearchService.mockReturnValue({
      getAllConnectors: vi.fn().mockRejectedValue({ status: 400, error: { code: 'BadRequest' } }),
    } as any);

    const operation = { type: 'Connector', inputs: { connector: '/connectors/foo' } } as any;

    const result = await initializeConnectorOperationDetails('node-1', operation, workflowKind, mockDispatch);

    // Must degrade gracefully instead of rejecting and hanging the whole load.
    expect(result).toBeUndefined();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'operationMetadata/updateErrorDetails',
        payload: expect.objectContaining({
          id: 'node-1',
          errorInfo: expect.objectContaining({
            message: expect.stringMatching(/Unable to initialize connector operation details/),
          }),
        }),
      })
    );
  });

  it('does not throw when getAgentConnectorOperation rejects', async () => {
    mockSearchService.mockReturnValue({
      getAllConnectors: vi.fn().mockResolvedValue([{ id: '/connectors/foo', name: 'foo', properties: {} }]),
      getAgentConnectorOperation: vi.fn().mockRejectedValue(new Error('boom')),
    } as any);

    const operation = { type: 'Connector', inputs: { connector: '/connectors/foo' } } as any;

    const result = await initializeConnectorOperationDetails('node-2', operation, workflowKind, mockDispatch);

    expect(result).toBeUndefined();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'operationMetadata/updateErrorDetails',
        payload: expect.objectContaining({ id: 'node-2' }),
      })
    );
  });

  it('returns an empty list without dispatching an error when the connector is not found', async () => {
    mockSearchService.mockReturnValue({
      getAllConnectors: vi.fn().mockResolvedValue([]),
    } as any);

    const operation = { type: 'Connector', inputs: { connector: '/connectors/missing' } } as any;

    const result = await initializeConnectorOperationDetails('node-3', operation, workflowKind, mockDispatch);

    expect(result).toEqual([]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
