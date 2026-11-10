// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionEntry } from '../connectionEntry';

const mockDispatch = vi.fn();
const mockUseReadOnly = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionById: () => ({
    result: {
      id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/test',
      name: 'test',
      properties: { displayName: 'Test connection' },
    },
  }),
}));

vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockUseReadOnly(),
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
  HostService: () => ({}),
  cleanResourceId: (id: string) => id,
  getConnectionErrors: () => [],
}));

vi.mock('../nodeLinkButton', () => ({
  NodeLinkButton: ({ nodeId }: { nodeId: string }) => <button type="button">{nodeId}</button>,
}));

const renderConnectionEntry = () =>
  render(
    <IntlProvider locale="en">
      <ConnectionEntry
        connectorId="/subscriptions/sub/providers/Microsoft.Web/locations/westus/managedApis/test"
        connectionReference={{
          connection: { id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/test' },
          nodes: ['action-1'],
        }}
      />
    </IntlProvider>
  );

describe('ConnectionEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReadOnly.mockReturnValue(false);
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
});
