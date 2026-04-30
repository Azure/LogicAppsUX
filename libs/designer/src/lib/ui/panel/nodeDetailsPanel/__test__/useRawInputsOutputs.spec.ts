import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockGetActionLinks = vi.fn();
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    RunService: () => ({
      getActionLinks: mockGetActionLinks,
    }),
  };
});

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useRunData: vi.fn(),
}));

const mockUseQuery = vi.fn(() => ({
  data: { inputs: {}, outputs: {} },
  isError: false,
  isFetching: false,
  isLoading: false,
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

import { useRunData } from '../../../../core/state/workflow/workflowSelectors';
import { useRawInputsOutputs } from '../useRawInputsOutputs';

describe('useRawInputsOutputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T00:01:00Z',
      correlation: { actionTrackingId: 'track-1' },
    });
  });

  it('should use stable query key with actionTrackingId, startTime, and endTime', () => {
    renderHook(() => useRawInputsOutputs('test-node'));

    const queryKey = mockUseQuery.mock.calls.at(-1)![0];
    expect(queryKey).toEqual([
      'actionInputsOutputs',
      {
        nodeId: 'test-node',
        actionTrackingId: 'track-1',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
      },
    ]);
  });

  it('should use a stable placeholderData reference (prevents infinite re-render)', () => {
    renderHook(() => useRawInputsOutputs('node-1'));
    const options1 = mockUseQuery.mock.calls.at(-1)![2];

    vi.clearAllMocks();
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T00:01:00Z',
      correlation: { actionTrackingId: 'track-1' },
    });

    renderHook(() => useRawInputsOutputs('node-1'));
    const options2 = mockUseQuery.mock.calls.at(-1)![2];

    // placeholderData must be the SAME reference across renders.
    // Inline object literals create new references each render, causing
    // data -> effect -> dispatch -> re-render -> new placeholder -> new data -> infinite loop.
    expect(options1.placeholderData).toBe(options2.placeholderData);
  });

  it('should always call getActionLinks even when runData has existing inputs/outputs', async () => {
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      inputs: { code: { displayName: 'Code', value: 'print("hi")' } },
      outputs: { result: { displayName: 'Result', value: 'hi' } },
      startTime: '2024-01-01T00:00:00Z',
      correlation: { actionTrackingId: 'track-2' },
    });

    mockGetActionLinks.mockResolvedValue({ inputs: { method: 'GET' }, outputs: { statusCode: 200 } });

    renderHook(() => useRawInputsOutputs('code_interpreter'));

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(mockGetActionLinks).toHaveBeenCalled();
    expect(result).toEqual({ inputs: { method: 'GET' }, outputs: { statusCode: 200 } });
  });

  it('should not re-feed already-bound BoundParameters as raw inputs (regression)', async () => {
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      inputs: { method: { displayName: 'Method', value: 'GET' } },
      startTime: '2024-01-01T00:00:00Z',
      correlation: { actionTrackingId: 'track-3' },
    });

    mockGetActionLinks.mockResolvedValue({ inputs: { method: 'GET' }, outputs: {} });

    renderHook(() => useRawInputsOutputs('test-node'));

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(result.inputs).toEqual({ method: 'GET' });
    expect(result.inputs).not.toHaveProperty('method.displayName');
  });

  it('should return empty inputs/outputs when getActionLinks returns nullish values', async () => {
    mockGetActionLinks.mockResolvedValue({ inputs: null, outputs: undefined });
    renderHook(() => useRawInputsOutputs('test-node'));

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(result).toEqual({ inputs: {}, outputs: {} });
  });

  it('should handle getActionLinks returning null/undefined entirely', async () => {
    mockGetActionLinks.mockResolvedValue(null);
    renderHook(() => useRawInputsOutputs('test-node'));

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(result).toEqual({ inputs: {}, outputs: {} });
  });

  it('should pass enabled option when provided', () => {
    renderHook(() => useRawInputsOutputs('test-node', { enabled: false }));

    const queryOptions = mockUseQuery.mock.calls.at(-1)![2];
    expect(queryOptions.enabled).toBe(false);
  });
});
