import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ContentLink } from '@microsoft/logic-apps-shared';

// We need to mock modules before imports
const mockGetAgentRepetition = vi.fn();
const mockGetAgentActionsRepetition = vi.fn();
const mockGetContent = vi.fn();

vi.mock('../../../queries/runs', () => ({
  getAgentRepetition: (...args: any[]) => mockGetAgentRepetition(...args),
  getAgentActionsRepetition: (...args: any[]) => mockGetAgentActionsRepetition(...args),
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

const mockParseInputs = vi.fn((inputs: any) => inputs);
const mockParseOutputs = vi.fn((outputs: any) => outputs);

vi.mock('../../../utils/monitoring', () => ({
  parseInputs: (...args: any[]) => mockParseInputs(...args),
  parseOutputs: (...args: any[]) => mockParseOutputs(...args),
}));

// Import the thunks AFTER mocks are set up
import { fetchBuiltInToolRunData, initializeInputsOutputsBinding } from '../monitoring';

describe('fetchBuiltInToolRunData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch action-level data via getAgentActionsRepetition and convert to BoundParameters', async () => {
    const mockInputs = { message: 'hello', code: 'print("hi")' };
    const mockOutputs = { result: 'hi', exitCode: 0 };

    // getAgentActionsRepetition returns action results with per-tool links
    mockGetAgentActionsRepetition.mockResolvedValue([
      {
        properties: {
          actionResults: [
            {
              name: 'code_interpreter',
              inputsLink: { uri: 'https://example.com/inputs' } as ContentLink,
              outputsLink: { uri: 'https://example.com/outputs' } as ContentLink,
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T00:01:00Z',
              status: 'Succeeded',
              correlation: { actionTrackingId: 'test-tracking-id' },
            },
          ],
        },
      },
    ]);

    mockGetContent.mockImplementation((link: ContentLink) => {
      if (link.uri === 'https://example.com/inputs') {
        return Promise.resolve(mockInputs);
      }
      if (link.uri === 'https://example.com/outputs') {
        return Promise.resolve(mockOutputs);
      }
      return Promise.resolve({});
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

    expect(mockGetAgentActionsRepetition).toHaveBeenCalledWith('agent1', 'run-123', '000000', 0);
    expect(mockGetAgentRepetition).not.toHaveBeenCalled();

    const payload = result.payload as any;
    expect(payload.toolNodeId).toBe('code_interpreter');
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

  it('should fall back to getAgentRepetition when tool action not found in action results', async () => {
    // getAgentActionsRepetition returns no matching tool action
    mockGetAgentActionsRepetition.mockResolvedValue([
      {
        properties: {
          actionResults: [{ name: 'other_tool' }],
        },
      },
    ]);

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

    expect(mockGetAgentActionsRepetition).toHaveBeenCalled();
    expect(mockGetAgentRepetition).toHaveBeenCalledWith('agent1', 'run-123', '000000');

    const payload = result.payload as any;
    expect(payload.inputs).toEqual({});
    expect(payload.outputs).toEqual({});
    expect(payload.status).toBe('Failed');
  });

  it('should skip content fetch when links have no URI', async () => {
    mockGetAgentActionsRepetition.mockResolvedValue([
      {
        properties: {
          actionResults: [
            {
              name: 'code_interpreter',
              inputsLink: { uri: undefined },
              outputsLink: null,
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T00:01:00Z',
              status: 'Succeeded',
              correlation: null,
            },
          ],
        },
      },
    ]);

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

  it('should use provided inputsLink/outputsLink without fetching action results', async () => {
    const inputsLink = { uri: 'https://example.com/inputs', contentSize: 100 } as ContentLink;
    const outputsLink = { uri: 'https://example.com/outputs', contentSize: 200 } as ContentLink;

    mockGetContent.mockResolvedValue({});

    const thunkArg = {
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
      inputsLink,
      outputsLink,
    };

    const dispatch = vi.fn();
    const getState = vi.fn();
    const action = fetchBuiltInToolRunData(thunkArg);
    const result = await action(dispatch, getState, undefined);

    // Should NOT call either fetch function since links were provided
    expect(mockGetAgentActionsRepetition).not.toHaveBeenCalled();
    expect(mockGetAgentRepetition).not.toHaveBeenCalled();

    const payload = result.payload as any;
    expect(payload.inputsLink).toEqual(inputsLink);
    expect(payload.outputsLink).toEqual(outputsLink);
  });

  it('should handle content fetch failure for inputs gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockGetAgentActionsRepetition.mockResolvedValue([
      {
        properties: {
          actionResults: [
            {
              name: 'code_interpreter',
              inputsLink: { uri: 'https://example.com/inputs' } as ContentLink,
              outputsLink: { uri: undefined },
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T00:01:00Z',
              status: 'Succeeded',
              correlation: null,
            },
          ],
        },
      },
    ]);

    mockGetContent.mockRejectedValue(new Error('Network error'));

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

    warnSpy.mockRestore();
  });

  it('should handle content fetch failure for outputs gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockGetAgentActionsRepetition.mockResolvedValue([
      {
        properties: {
          actionResults: [
            {
              name: 'code_interpreter',
              inputsLink: { uri: undefined },
              outputsLink: { uri: 'https://example.com/outputs' } as ContentLink,
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T00:01:00Z',
              status: 'Succeeded',
              correlation: null,
            },
          ],
        },
      },
    ]);

    mockGetContent.mockRejectedValue(new Error('Network error'));

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
    expect(payload.outputs).toEqual({});

    warnSpy.mockRestore();
  });
});

describe('initializeInputsOutputsBinding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fall back to parseInputs/parseOutputs when getState throws', async () => {
    const mockInputs = { key1: 'value1' };
    const mockOutputs = { key2: 'value2' };
    mockParseInputs.mockReturnValue({ parsed: 'inputs' });
    mockParseOutputs.mockReturnValue({ parsed: 'outputs' });

    const thunkArg = {
      nodeId: 'testNode',
      inputsOutputs: {
        nodeId: 'testNode',
        inputs: mockInputs,
        outputs: mockOutputs,
      },
    };

    const dispatch = vi.fn();
    // Return null to trigger an error when accessing rootState.operations.operationInfo
    const getState = vi.fn().mockReturnValue(null);

    const action = initializeInputsOutputsBinding(thunkArg);
    const result = await action(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(mockParseInputs).toHaveBeenCalledWith(mockInputs);
    expect(mockParseOutputs).toHaveBeenCalledWith(mockOutputs);
    expect(payload.nodeId).toBe('testNode');
    expect(payload.inputs).toEqual({ parsed: 'inputs' });
    expect(payload.outputs).toEqual({ parsed: 'outputs' });
  });

  it('should return bound inputs and outputs on success with empty state', async () => {
    const thunkArg = {
      nodeId: 'testNode',
      inputsOutputs: {
        nodeId: 'testNode',
        inputs: {},
        outputs: {},
      },
    };

    const dispatch = vi.fn();
    const getState = vi.fn().mockReturnValue({
      operations: { operationInfo: {}, inputParameters: {}, outputParameters: {} },
      workflow: { operations: {} },
    });

    const action = initializeInputsOutputsBinding(thunkArg);
    const result = await action(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(payload.nodeId).toBe('testNode');
    expect(payload.inputs).toBeUndefined();
    expect(payload.outputs).toBeUndefined();
  });
});
