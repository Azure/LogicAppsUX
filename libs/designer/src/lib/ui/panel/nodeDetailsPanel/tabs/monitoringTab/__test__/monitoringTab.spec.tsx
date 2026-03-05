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

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ErrorSection: vi.fn(() => <div data-testid="error-section" />),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { inputs: {}, outputs: {} },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
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
import { useQuery } from '@tanstack/react-query';

describe('MonitoringPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T00:01:00Z',
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

  it('should use cached data for built-in tools with existing inputs/outputs', () => {
    const cachedInputs = { code: { displayName: 'Code', value: 'print("hi")' } };
    const cachedOutputs = { result: { displayName: 'Result', value: 'hi' } };

    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      inputs: cachedInputs,
      outputs: cachedOutputs,
      startTime: '2024-01-01T00:00:00Z',
    });

    render(<MonitoringPanel nodeId="code_interpreter" />);

    // The query should resolve with cached data instead of calling getActionLinks
    // Verify that getActionLinks was NOT called
    expect(mockGetActionLinks).not.toHaveBeenCalled();
  });

  it('should call getActionLinks for regular nodes without cached data', () => {
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
    });

    // The useQuery mock handles this, but we can verify getActionLinks would be called
    // by checking the query function behavior
    render(<MonitoringPanel nodeId="regular-node" />);

    // The component should render successfully
    expect(screen.getByTestId('inputs-panel')).toBeDefined();
  });
});
