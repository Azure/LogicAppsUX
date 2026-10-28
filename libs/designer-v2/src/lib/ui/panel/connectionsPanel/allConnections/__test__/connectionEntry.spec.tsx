// @vitest-environment jsdom
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionEntry } from '../connectionEntry';

const mockDispatch = vi.fn();
const mockUseReadOnly = vi.fn();
const mockUseMonitoringView = vi.fn();
const mockUseConnectionById = vi.fn();
const mockGetConnectionErrors = vi.fn();
const mockOpenConnectionResource = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionById: (connectionId: string, connectorId: string) => mockUseConnectionById(connectionId, connectorId),
}));

vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockUseReadOnly(),
  useMonitoringView: () => mockUseMonitoringView(),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  openPanel: vi.fn((payload) => ({ type: 'panel/openPanel', payload })),
}));

vi.mock('@microsoft/designer-ui', () => ({
  useConnectionContainerStyles: () => ({
    connectionStatusIcon: 'connectionStatusIcon',
    iconError: 'iconError',
    iconSuccess: 'iconSuccess',
  }),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  HostService: () => ({ openConnectionResource: mockOpenConnectionResource }),
  cleanResourceId: (id: string) => id,
  getConnectionErrors: (connection: unknown) => mockGetConnectionErrors(connection),
}));

vi.mock('../nodeLinkButton', () => ({
  NodeLinkButton: ({ nodeId }: { nodeId: string }) => <button type="button">{nodeId}</button>,
}));

const connectorId = '/subscriptions/sub/providers/Microsoft.Web/locations/westus/managedApis/test';
const connectionId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/test';
const runtimeTitle = 'Connection selected at runtime';
const reassignLabel = 'Reassign all connected actions to a new connection';
const connectionReference = {
  api: { id: connectorId },
  connection: { id: connectionId },
  nodes: ['action-1'],
};

const renderConnectionEntry = (props: Partial<ComponentProps<typeof ConnectionEntry>> = {}) =>
  render(
    <FluentProvider theme={webLightTheme}>
      <IntlProvider locale="en">
        <ConnectionEntry connectorId={connectorId} connectionReference={connectionReference} {...props} />
      </IntlProvider>
    </FluentProvider>
  );

describe('ConnectionEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReadOnly.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockGetConnectionErrors.mockReturnValue([]);
    mockUseConnectionById.mockReturnValue({
      result: { id: connectionId, name: 'test', properties: { displayName: 'Test connection' } },
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('allows reassignment when the designer is editable', () => {
    renderConnectionEntry();

    const reassignButton = screen.getByRole('button', { name: 'Reassign all connected actions to a new connection' });
    expect(reassignButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(reassignButton);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'panel/openPanel',
      payload: { nodeIds: ['action-1'], panelMode: 'Connection', referencePanelMode: 'Connection' },
    });
  });

  it('disables reassignment when the designer is read-only', () => {
    mockUseReadOnly.mockReturnValue(true);
    renderConnectionEntry();

    const reassignButton = screen.getByRole('button', { name: 'Reassign all connected actions to a new connection' });
    expect(reassignButton.hasAttribute('disabled')).toBe(true);
    expect(reassignButton.hasAttribute('style')).toBe(false);

    fireEvent.click(reassignButton);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('disables reassignment when the designer is monitoring', () => {
    mockUseMonitoringView.mockReturnValue(true);
    renderConnectionEntry();

    const reassignButton = screen.getByRole('button', { name: reassignLabel });
    expect(reassignButton).toBeDisabled();
    expect(reassignButton.hasAttribute('style')).toBe(false);
    fireEvent.click(reassignButton);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('preserves concrete resource lookup, valid status, and the resource-open action', () => {
    const { container } = renderConnectionEntry();

    expect(mockUseConnectionById).toHaveBeenCalledWith(connectionId, connectorId);
    expect(screen.getByText('Test connection')).toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="CheckmarkCircle24Filled"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open connection' }));
    expect(mockOpenConnectionResource).toHaveBeenCalledExactlyOnceWith(connectionId);
  });

  it.each([
    { scenario: 'no resolved resource', query: { result: undefined, isLoading: false } },
    { scenario: 'a loading query', query: { result: undefined, isLoading: true } },
    {
      scenario: 'a stale invalid resource',
      query: {
        result: { id: connectionId, name: 'stale-resource', properties: { displayName: 'Stale display name' } },
        isLoading: false,
      },
    },
  ])('renders neutral runtime status with $scenario rather than a fabricated resource or disconnected state', ({ query }) => {
    mockUseConnectionById.mockReturnValue(query);
    mockGetConnectionErrors.mockReturnValue([{ status: 'Error', error: { code: 'Unauthorized', message: 'Provider resource error' } }]);
    const { container } = renderConnectionEntry({ connectionReference: undefined, runtimeNodeIds: ['runtime-1', 'runtime-2'] });

    expect(mockUseConnectionById).toHaveBeenCalledWith('', '');
    expect(mockGetConnectionErrors).not.toHaveBeenCalled();
    expect(screen.getByText(runtimeTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'runtime-1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'runtime-2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open connection' })).not.toBeInTheDocument();
    expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
    expect(screen.queryByText('Stale display name')).not.toBeInTheDocument();
    expect(screen.queryByText('stale-resource')).not.toBeInTheDocument();
    expect(screen.queryByText('Provider resource error')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="LinkMultiple24Regular"]')).not.toBeNull();
    expect(container.querySelector('[data-icon-name="CheckmarkCircle24Filled"]')).toBeNull();
    expect(container.querySelector('[data-icon-name="ErrorCircle24Filled"]')).toBeNull();
    expect(container.querySelector('[data-icon-name="PlugDisconnected24Filled"]')).toBeNull();
    expect(container.querySelector('.disconnected')).toBeNull();
    expect(mockOpenConnectionResource).not.toHaveBeenCalled();
  });

  it('reassigns the entire runtime block without requiring a connection reference', () => {
    renderConnectionEntry({ connectionReference: undefined, runtimeNodeIds: ['runtime-1', 'runtime-2'] });

    fireEvent.click(screen.getByRole('button', { name: reassignLabel }));
    expect(mockDispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'panel/openPanel',
      payload: { nodeIds: ['runtime-1', 'runtime-2'], panelMode: 'Connection', referencePanelMode: 'Connection' },
    });
  });

  it.each([
    { readOnly: true, monitoring: false },
    { readOnly: false, monitoring: true },
    { readOnly: true, monitoring: true },
  ])('prevents runtime reassignment when readOnly=$readOnly and monitoring=$monitoring', ({ readOnly, monitoring }) => {
    mockUseReadOnly.mockReturnValue(readOnly);
    mockUseMonitoringView.mockReturnValue(monitoring);
    renderConnectionEntry({ connectionReference: undefined, runtimeNodeIds: ['runtime-1', 'runtime-2'] });

    const button = screen.getByRole('button', { name: reassignLabel });
    expect(button).toBeDisabled();
    expect(button.hasAttribute('style')).toBe(false);
    fireEvent.click(button);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
