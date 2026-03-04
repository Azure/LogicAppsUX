import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ContentLink } from '@microsoft/logic-apps-shared';

// We need to mock modules before imports
const mockGetAgentRepetition = vi.fn();
const mockGetContent = vi.fn();

vi.mock('../../../queries/runs', () => ({
  getAgentRepetition: (...args: any[]) => mockGetAgentRepetition(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    RunService: () => ({
      getContent: (...args: any[]) => mockGetContent(...args),
    }),
    LoggerService: () => ({
      startTrace: () => 'mock-trace-id',
      endTrace: vi.fn(),
      log: vi.fn(),
    }),
  };
});

vi.mock('../../../queries/operation', () => ({
  getOperationManifest: vi.fn(),
}));

vi.mock('../../../queries/connections', () => ({
  getConnectorWithSwagger: vi.fn(),
}));

vi.mock('../initialize', () => ({
  getCustomSwaggerIfNeeded: vi.fn(),
}));

// Import the thunk AFTER mocks are set up
import { fetchBuiltInToolRunData } from '../monitoring';

describe('fetchBuiltInToolRunData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch repetition data and convert inputs/outputs to BoundParameters', async () => {
    const mockInputs = { message: 'hello', code: 'print("hi")' };
    const mockOutputs = { result: 'hi', exitCode: 0 };

    mockGetAgentRepetition.mockResolvedValue({
      properties: {
        inputsLink: { uri: 'https://example.com/inputs' } as ContentLink,
        outputsLink: { uri: 'https://example.com/outputs' } as ContentLink,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        status: 'Succeeded',
        correlation: { actionTrackingId: 'test-tracking-id' },
      },
    });

    mockGetContent.mockImplementation((link: ContentLink) => {
      if (link.uri === 'https://example.com/inputs') {
        return Promise.resolve(mockInputs);
      }
      if (link.uri === 'https://example.com/outputs') {
        return Promise.resolve(mockOutputs);
      }
      return Promise.resolve({});
    });

    // Call the thunk's payload creator directly
    const thunkArg = {
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
    };

    // Access the payloadCreator (the async function passed to createAsyncThunk)
    // We dispatch to a mock store to get the result
    const dispatch = vi.fn();
    const getState = vi.fn();
    const action = fetchBuiltInToolRunData(thunkArg);
    const result = await action(dispatch, getState, undefined);

    expect(mockGetAgentRepetition).toHaveBeenCalledWith('agent1', 'run-123', '000000');

    // The fulfilled action payload should contain properly formatted BoundParameters
    const payload = result.payload as any;
    expect(payload.toolNodeId).toBe('code_interpreter');
    // labelCase replaces underscores with spaces, otherwise preserves the key
    expect(payload.inputs).toEqual({
      message: { displayName: 'message', value: 'hello' },
      code: { displayName: 'code', value: 'print("hi")' },
    });
    expect(payload.outputs).toEqual({
      result: { displayName: 'result', value: 'hi' },
      exitCode: { displayName: 'exitCode', value: 0 },
    });
    expect(payload.status).toBe('Succeeded');
    expect(payload.startTime).toBe('2024-01-01T00:00:00Z');
    expect(payload.endTime).toBe('2024-01-01T00:01:00Z');
    expect(payload.correlation).toEqual({ actionTrackingId: 'test-tracking-id' });
  });

  it('should handle content fetch failures gracefully with empty BoundParameters', async () => {
    mockGetAgentRepetition.mockResolvedValue({
      properties: {
        inputsLink: { uri: 'https://example.com/inputs' } as ContentLink,
        outputsLink: { uri: 'https://example.com/outputs' } as ContentLink,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        status: 'Failed',
        correlation: null,
      },
    });

    mockGetContent.mockRejectedValue(new Error('Content not found'));

    const thunkArg = {
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
    };

    const dispatch = vi.fn();
    const getState = vi.fn();
    const action = fetchBuiltInToolRunData(thunkArg);
    const result = await action(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(payload.inputs).toEqual({});
    expect(payload.outputs).toEqual({});
    expect(payload.status).toBe('Failed');
  });

  it('should skip content fetch when links have no URI', async () => {
    mockGetAgentRepetition.mockResolvedValue({
      properties: {
        inputsLink: { uri: undefined },
        outputsLink: null,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        status: 'Succeeded',
        correlation: null,
      },
    });

    const thunkArg = {
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
    };

    const dispatch = vi.fn();
    const getState = vi.fn();
    const action = fetchBuiltInToolRunData(thunkArg);
    const result = await action(dispatch, getState, undefined);

    expect(mockGetContent).not.toHaveBeenCalled();
    const payload = result.payload as any;
    expect(payload.inputs).toEqual({});
    expect(payload.outputs).toEqual({});
  });

  it('should pass through inputsLink and outputsLink from repetition', async () => {
    const inputsLink = { uri: 'https://example.com/inputs', contentSize: 100 } as ContentLink;
    const outputsLink = { uri: 'https://example.com/outputs', contentSize: 200 } as ContentLink;

    mockGetAgentRepetition.mockResolvedValue({
      properties: {
        inputsLink,
        outputsLink,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        status: 'Succeeded',
        correlation: null,
      },
    });

    mockGetContent.mockResolvedValue({});

    const thunkArg = {
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
    };

    const dispatch = vi.fn();
    const getState = vi.fn();
    const action = fetchBuiltInToolRunData(thunkArg);
    const result = await action(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(payload.inputsLink).toEqual(inputsLink);
    expect(payload.outputsLink).toEqual(outputsLink);
  });
});
