/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SelectConnection } from '../selectConnection';
import type { Connection } from '@microsoft/logic-apps-shared';
import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

// Mock ResizeObserver (required by Fluent UI)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock react-intl
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }: { defaultMessage: string }) => defaultMessage),
    }),
  };
});

// Mock ConnectionTable to avoid rendering the full table component
vi.mock('../connectionTable', () => ({
  ConnectionTable: ({ connections }: { connections: Connection[] }) => (
    <div data-testid="connection-table">
      {connections.map((c) => (
        <div key={c.id}>{c.properties.displayName}</div>
      ))}
    </div>
  ),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => <FluentProvider theme={webLightTheme}>{children}</FluentProvider>;

const mockApi: Connection['properties']['api'] = {
  brandColor: '#008372',
  category: 'Standard',
  description: 'Azure OpenAI',
  displayName: 'Azure OpenAI',
  iconUri: 'https://example.com/icon.png',
  id: '/subscriptions/sub1/providers/Microsoft.Web/locations/westus/managedApis/openai',
  name: 'openai',
  type: 'Microsoft.Web/locations/managedApis',
};

const mockConnection: Connection = {
  id: '/subscriptions/sub1/connections/conn1',
  name: 'conn1',
  properties: {
    api: mockApi,
    createdTime: '2026-01-01T00:00:00Z',
    displayName: 'My Connection',
    overallStatus: 'Connected',
    statuses: [{ status: 'Connected' }],
  },
  type: 'Microsoft.Web/connections',
};

const defaultProps = {
  connections: [mockConnection],
  currentConnectionId: mockConnection.id,
  saveSelectionCallback: vi.fn(),
  cancelSelectionCallback: vi.fn(),
  isXrmConnectionReferenceMode: false,
  addButton: {
    text: 'Add new',
    onAdd: vi.fn(),
  },
  cancelButton: {
    onCancel: vi.fn(),
  },
};

describe('SelectConnection', () => {
  it('should render the connection description', () => {
    render(<SelectConnection {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Select an existing connection or create a new one')).toBeTruthy();
  });

  it('should render XRM description when in XRM mode', () => {
    render(<SelectConnection {...defaultProps} isXrmConnectionReferenceMode={true} />, { wrapper: Wrapper });
    expect(screen.getByText('Select an existing connection reference or create a new one')).toBeTruthy();
  });

  it('should render the connection table with connections', () => {
    render(<SelectConnection {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('connection-table').length).toBeGreaterThan(0);
  });

  it('should render the actions container', () => {
    render(<SelectConnection {...defaultProps} />, { wrapper: Wrapper });
    expect(document.querySelector('.msla-edit-connection-actions-container')).toBeTruthy();
  });

  it('should render error message when errorMessage is provided', () => {
    render(<SelectConnection {...defaultProps} errorMessage="Something went wrong" />, { wrapper: Wrapper });
    expect(screen.getAllByText('Something went wrong').length).toBeGreaterThan(0);
  });

  it('should render action bar when provided', () => {
    render(<SelectConnection {...defaultProps} actionBar={<div data-testid="action-bar">Actions</div>} />, { wrapper: Wrapper });
    expect(screen.getByTestId('action-bar')).toBeTruthy();
  });
});
