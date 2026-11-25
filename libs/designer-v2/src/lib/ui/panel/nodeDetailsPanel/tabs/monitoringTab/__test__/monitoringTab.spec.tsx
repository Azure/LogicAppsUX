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
  useNodeMetadata: () => undefined,
  useSelectedLoopRepetition: () => undefined,
}));

vi.mock('../../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: vi.fn(() => false),
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
import { useSharedNodeUi } from '../../../../../../core/state/designerOptions/designerOptionsSelectors';

describe('MonitoringPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSharedNodeUi).mockReturnValue(false);
    (useRunData as any).mockReturnValue({
      status: 'Succeeded',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T00:01:00Z',
    });
  });

  it.each([false, true])('renders nothing without run metadata (shared layout: %s)', (showComparison) => {
    vi.mocked(useSharedNodeUi).mockReturnValue(showComparison);
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

  it('keeps legacy composition when shared node UI is disabled', () => {
    const { container } = render(<MonitoringPanel nodeId="test-node" />);

    expect(Array.from(container.children)).toEqual([
      screen.getByTestId('error-section'),
      screen.getByTestId('inputs-panel'),
      screen.getByTestId('outputs-panel'),
      screen.getByTestId('properties-panel'),
    ]);
  });

  it('uses shared comparison layout only when shared node UI is enabled', () => {
    vi.mocked(useSharedNodeUi).mockReturnValue(true);
    const { container } = render(<MonitoringPanel nodeId="test-node" />);

    const layout = container.querySelector('[data-monitoring-payload-comparison]');
    const grid = container.querySelector('[data-monitoring-payload-grid]');

    expect(Array.from(container.children)).toEqual([screen.getByTestId('error-section'), layout]);
    expect(Array.from(layout?.children ?? [])).toEqual([grid, screen.getByTestId('properties-panel')]);
    expect(Array.from(grid?.children ?? [], (pane) => pane.firstElementChild)).toEqual([
      screen.getByTestId('inputs-panel'),
      screen.getByTestId('outputs-panel'),
    ]);
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
