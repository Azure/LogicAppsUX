import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock dispatch
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../../../common/utilities/error', () => ({
  getMonitoringTabError: vi.fn(),
}));

vi.mock('../../../../../../core/state/operation/operationSelector', () => ({
  useBrandColor: vi.fn(() => '#000000'),
}));

vi.mock('../../../../../../core/state/workflow/workflowSelectors', () => ({
  useRunData: vi.fn(),
}));

const mockUseRawInputsOutputs = vi.fn(() => ({
  data: { inputs: {}, outputs: {} },
  isError: false,
  isFetching: false,
  isLoading: false,
}));
vi.mock('../../../useRawInputsOutputs', () => ({
  useRawInputsOutputs: (...args: any[]) => mockUseRawInputsOutputs(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isNullOrUndefined: actual.isNullOrUndefined,
  };
});

vi.mock('@microsoft/designer-ui', () => ({
  ErrorSection: vi.fn(() => <div data-testid="error-section" />),
  SecureDataSection: vi.fn(() => <div data-testid="secure-data-section" />),
  ValuesPanel: vi.fn(() => <div data-testid="values-panel" />),
  getStatusString: vi.fn(() => 'Succeeded'),
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

  it('should pass nodeId to useRawInputsOutputs', () => {
    render(<MonitoringPanel nodeId="my-action" />);
    expect(mockUseRawInputsOutputs).toHaveBeenCalledWith('my-action');
  });

  it('should show loading state when inputs are being fetched', () => {
    mockUseRawInputsOutputs.mockReturnValue({
      data: { inputs: {}, outputs: {} },
      isError: false,
      isFetching: true,
      isLoading: true,
    });
    render(<MonitoringPanel nodeId="test-node" />);
    expect(screen.getByTestId('inputs-panel')).toBeDefined();
  });

  it('should show error state when inputs fail to load', () => {
    mockUseRawInputsOutputs.mockReturnValue({
      data: { inputs: {}, outputs: {} },
      isError: true,
      isFetching: false,
      isLoading: false,
    });
    render(<MonitoringPanel nodeId="test-node" />);
    expect(screen.getByTestId('inputs-panel')).toBeDefined();
  });
});
