import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock dispatch
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

// Mock hooks and services
vi.mock('../../../../../../common/utilities/error', () => ({
  getMonitoringTabError: vi.fn(),
}));

vi.mock('../../../../../../core/state/operation/operationSelector', () => ({
  useBrandColor: vi.fn(() => '#000000'),
}));

vi.mock('../../../../../../core/state/workflow/workflowSelectors', () => ({
  useRunData: vi.fn(),
}));

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

vi.mock('@microsoft/designer-ui', () => ({
  ErrorSection: vi.fn(() => <div data-testid="error-section" />),
  SecureDataSection: vi.fn(() => <div data-testid="secure-data-section" />),
  ValuesPanel: vi.fn(() => <div data-testid="values-panel" />),
  getStatusString: vi.fn(() => 'Succeeded'),
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

vi.mock('../../../../../../core/actions/bjsworkflow/monitoring', () => ({
  initializeInputsOutputsBinding: vi.fn(),
}));

vi.mock('../inputsPanel', () => ({
  InputsPanel: vi.fn(() => <div data-testid="inputs-panel" />),
}));

vi.mock('../outputsPanel', () => ({
  OutputsPanel: vi.fn(() => <div data-testid="outputs-panel" />),
}));

vi.mock('../propertiesPanel', () => ({
  PropertiesPanel: vi.fn(() => <div data-testid="properties-panel" />),
}));

import { MonitoringPanel } from '../monitoringTab';
import { useRunData } from '../../../../../../core/state/workflow/workflowSelectors';

describe('MonitoringPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T00:01:00Z',
      correlation: { actionTrackingId: 'track-1' },
    });
  });

  it('should render null when runMetaData is null', () => {
    (useRunData as any).mockReturnValue(null);

    const { container } = render(<MonitoringPanel nodeId="test-node" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render panels when runMetaData is present', () => {
    render(<MonitoringPanel nodeId="test-node" />);

    expect(screen.getByTestId('error-section')).toBeDefined();
    expect(screen.getByTestId('inputs-panel')).toBeDefined();
    expect(screen.getByTestId('outputs-panel')).toBeDefined();
    expect(screen.getByTestId('properties-panel')).toBeDefined();
  });

  it('should always call getActionLinks even when runData has existing inputs/outputs', async () => {
    const existingInputs = { code: { displayName: 'Code', value: 'print("hi")' } };
    const existingOutputs = { result: { displayName: 'Result', value: 'hi' } };

    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      inputs: existingInputs,
      outputs: existingOutputs,
      startTime: '2024-01-01T00:00:00Z',
      correlation: { actionTrackingId: 'track-2' },
    });

    mockGetActionLinks.mockResolvedValue({ inputs: { method: 'GET' }, outputs: { statusCode: 200 } });

    render(<MonitoringPanel nodeId="code_interpreter" />);

    // Extract the query function passed to useQuery and invoke it
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    const queryFn = lastCall[1] as () => Promise<any>;
    const result = await queryFn();

    // The query function should always call getActionLinks, never short-circuit
    expect(mockGetActionLinks).toHaveBeenCalled();
    expect(result).toEqual({ inputs: { method: 'GET' }, outputs: { statusCode: 200 } });
  });

  it('should use stable query key with actionTrackingId, startTime, and endTime', () => {
    render(<MonitoringPanel nodeId="test-node" />);

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

  it('should not re-feed already-bound BoundParameters as raw inputs (regression)', async () => {
    // Simulate the scenario that caused infinite scrolling:
    // runData.inputs already contains BoundParameters from a previous binding cycle
    const alreadyBoundInputs = {
      method: { displayName: 'Method', value: 'GET' },
    };

    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      inputs: alreadyBoundInputs,
      startTime: '2024-01-01T00:00:00Z',
      correlation: { actionTrackingId: 'track-3' },
    });

    // getActionLinks returns fresh raw data from the API
    mockGetActionLinks.mockResolvedValue({ inputs: { method: 'GET' }, outputs: {} });

    render(<MonitoringPanel nodeId="test-node" />);

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    // The query function must return raw API data, NOT the already-bound BoundParameters.
    // If it returned alreadyBoundInputs, the binding would wrap {displayName, value}
    // inside another {displayName, value}, creating infinite recursive nesting.
    expect(result.inputs).toEqual({ method: 'GET' });
    expect(result.inputs).not.toHaveProperty('method.displayName');
  });

  it('should return empty inputs/outputs when getActionLinks returns nullish values', async () => {
    mockGetActionLinks.mockResolvedValue({ inputs: null, outputs: undefined });

    render(<MonitoringPanel nodeId="test-node" />);

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(result).toEqual({ inputs: {}, outputs: {} });
  });

  it('should handle getActionLinks returning null/undefined entirely', async () => {
    mockGetActionLinks.mockResolvedValue(null);

    render(<MonitoringPanel nodeId="test-node" />);

    const queryFn = mockUseQuery.mock.calls.at(-1)![1] as () => Promise<any>;
    const result = await queryFn();

    expect(result).toEqual({ inputs: {}, outputs: {} });
  });

  it('should disable the query when runMetaData is null', () => {
    (useRunData as any).mockReturnValue(null);

    render(<MonitoringPanel nodeId="test-node" />);

    const queryOptions = mockUseQuery.mock.calls.at(-1)![2];
    expect(queryOptions.enabled).toBe(false);
  });
});
