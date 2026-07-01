/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import React from 'react';
import { PanelRoot } from '../panelRoot';
import { PanelLocation } from '@microsoft/designer-ui';

// Mock FluentUI Panel to render children directly (avoids layer/portal issues in jsdom)
vi.mock('@fluentui/react', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Panel: ({ children, isOpen }: any) => (isOpen ? React.createElement('div', { 'data-testid': 'fluent-panel' }, children) : null),
  };
});

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Dialog: ({ children, open }: any) => (open ? React.createElement('div', { 'data-testid': 'fluent-dialog' }, children) : null),
    Spinner: () => React.createElement('div', { 'data-testid': 'loading-spinner', role: 'progressbar' }),
  };
});

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useIsDarkMode: vi.fn(() => false),
}));

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useCurrentPanelMode: vi.fn(() => 'Operation'),
  useFocusReturnElementId: vi.fn(() => undefined),
  useIsPanelCollapsed: vi.fn(() => false),
  useIsPanelLoading: vi.fn(() => false),
  useOperationPanelSelectedNodeIds: vi.fn(() => []),
}));

vi.mock('../../../core/state/panel/panelSlice', () => ({
  default: vi.fn(() => ({})),
  clearPanel: vi.fn(() => ({ type: 'panel/clearPanel' })),
}));

vi.mock('../nodeDetailsPanel/nodeDetailsPanel', () => ({
  NodeDetailsPanel: () => React.createElement('div', { 'data-testid': 'node-details-panel' }, 'Node Details Panel'),
}));

vi.mock('../connectionsPanel/connectionsPanel', () => ({
  ConnectionPanel: () => React.createElement('div', { 'data-testid': 'connection-panel' }, 'Connection Panel'),
}));

vi.mock('../errorsPanel/errorsPanel', () => ({
  ErrorsPanel: () => React.createElement('div', { 'data-testid': 'errors-panel' }, 'Errors Panel'),
}));

vi.mock('../assertionsPanel/assertionsPanel', () => ({
  AssertionsPanel: () => React.createElement('div', { 'data-testid': 'assertions-panel' }, 'Assertions Panel'),
}));

vi.mock('../recommendation/recommendationPanelContext', () => ({
  RecommendationPanelContext: () => React.createElement('div', { 'data-testid': 'recommendation-panel' }, 'Recommendation Panel'),
}));

vi.mock('../workflowParametersPanel/workflowParametersPanel', () => ({
  WorkflowParametersPanel: () => React.createElement('div', { 'data-testid': 'workflow-parameters-panel' }, 'Workflow Parameters Panel'),
}));

vi.mock('../workflowParametersPanel/workflowParametersPanelFooter', () => ({
  WorkflowParametersPanelFooter: () => React.createElement('div', { 'data-testid': 'workflow-parameters-footer' }, 'Footer'),
}));

vi.mock('../nodeSearchPanel/nodeSearchDialog', () => ({
  NodeSearchDialog: () => React.createElement('div', { 'data-testid': 'node-search-dialog' }, 'Node Search Dialog'),
}));

vi.mock('../multiSelectPanel/multiSelectPanel', () => ({
  MultiSelectPanel: () => React.createElement('div', { 'data-testid': 'multi-select-panel' }, 'Multi Select Panel'),
}));

vi.mock('../../../core/state/designerView/designerViewSelectors', () => ({
  useShowMultiSelectDeleteModal: vi.fn(() => false),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    PanelResizer: () => React.createElement('div', { 'data-testid': 'panel-resizer' }, 'Resizer'),
  };
});

import { useCurrentPanelMode, useIsPanelCollapsed, useIsPanelLoading } from '../../../core/state/panel/panelSelectors';

const mockUseCurrentPanelMode = vi.mocked(useCurrentPanelMode);
const mockUseIsPanelCollapsed = vi.mocked(useIsPanelCollapsed);
const mockUseIsPanelLoading = vi.mocked(useIsPanelLoading);

const createTestStore = () =>
  configureStore({
    reducer: {
      panel: (state = {}) => state,
    },
  });

const createWrapper = () => {
  const store = createTestStore();
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <IntlProvider locale="en">{children}</IntlProvider>
    </Provider>
  );
};

const defaultProps = {
  panelContainerRef: { current: document.createElement('div') },
  panelLocation: PanelLocation.Right,
};

describe('PanelRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentPanelMode.mockReturnValue('Operation');
    mockUseIsPanelCollapsed.mockReturnValue(false);
    mockUseIsPanelLoading.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  test('should return null when currentPanelMode is undefined', () => {
    mockUseCurrentPanelMode.mockReturnValue(undefined as any);

    const { container } = render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(container.innerHTML).toBe('');
  });

  test('should render NodeDetailsPanel when mode is Operation', () => {
    mockUseCurrentPanelMode.mockReturnValue('Operation');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('node-details-panel')).toBeDefined();
  });

  test('should render loading spinner when isLoading is true', () => {
    mockUseIsPanelLoading.mockReturnValue(true);
    mockUseCurrentPanelMode.mockReturnValue('Discovery');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });

  test('should render RecommendationPanelContext when mode is Discovery', () => {
    mockUseCurrentPanelMode.mockReturnValue('Discovery');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('recommendation-panel')).toBeDefined();
  });

  test('should render WorkflowParametersPanel when mode is WorkflowParameters', () => {
    mockUseCurrentPanelMode.mockReturnValue('WorkflowParameters');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('workflow-parameters-panel')).toBeDefined();
  });

  test('should render ConnectionPanel when mode is Connection', () => {
    mockUseCurrentPanelMode.mockReturnValue('Connection');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('connection-panel')).toBeDefined();
  });

  test('should render ErrorsPanel when mode is Error', () => {
    mockUseCurrentPanelMode.mockReturnValue('Error');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('errors-panel')).toBeDefined();
  });

  test('should render AssertionsPanel when mode is Assertions', () => {
    mockUseCurrentPanelMode.mockReturnValue('Assertions');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('assertions-panel')).toBeDefined();
  });

  test('should render NodeSearchDialog in a Dialog when mode is NodeSearch', () => {
    mockUseCurrentPanelMode.mockReturnValue('NodeSearch');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('fluent-dialog')).toBeDefined();
    expect(screen.getByTestId('node-search-dialog')).toBeDefined();
  });

  test('should render PanelResizer when isResizeable is true', () => {
    mockUseCurrentPanelMode.mockReturnValue('Discovery');

    render(<PanelRoot {...defaultProps} isResizeable={true} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('panel-resizer')).toBeDefined();
  });

  test('should not render PanelResizer when isResizeable is falsy', () => {
    mockUseCurrentPanelMode.mockReturnValue('Discovery');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('panel-resizer')).toBeNull();
  });

  test('should not render panel content when collapsed', () => {
    mockUseIsPanelCollapsed.mockReturnValue(true);
    mockUseCurrentPanelMode.mockReturnValue('Discovery');

    render(<PanelRoot {...defaultProps} />, { wrapper: createWrapper() });

    // Mocked Panel returns null when isOpen is false (collapsed = true => isOpen = false)
    expect(screen.queryByTestId('fluent-panel')).toBeNull();
    expect(screen.queryByTestId('recommendation-panel')).toBeNull();
  });
});
