/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionParameterProps } from '../../formInputs/universalConnectionParameter';
import { CosmosDbConnector } from '../cosmosConnector';

vi.mock('@fluentui/react-components', () => ({
  Button: ({ onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      Refresh
    </button>
  ),
  Combobox: ({ children }: any) => <div>{children}</div>,
  Field: ({ children }: any) => <div>{children}</div>,
  Link: ({ children }: any) => <a href="https://example.com">{children}</a>,
  Option: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@fluentui/react-icons', () => ({
  ArrowClockwise20Filled: () => null,
  ArrowClockwise20Regular: () => null,
  bundleIcon: () => () => null,
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  ResourceService: () => ({ executeResourceAction: vi.fn() }),
  LogEntryLevel: { Error: 'Error' },
  LoggerService: () => ({ log: vi.fn() }),
  equals: (left: unknown, right: unknown) => left === right,
  isArmResourceId: (value: string) => value.startsWith('/subscriptions/'),
}));

const mockUseAllCosmosDbServiceAccounts = vi.fn();

vi.mock('../../../../../../core/state/connection/connectionSelector', () => ({
  useSubscriptions: () => ({ isFetching: false, data: [] }),
}));

vi.mock('../useCognitiveService', () => ({
  useAllCosmosDbServiceAccounts: (subscriptionId: string) => mockUseAllCosmosDbServiceAccounts(subscriptionId),
}));

vi.mock('../components/SubscriptionDropdown', () => ({
  SubscriptionDropdown: ({ selectedSubscriptionId, setSelectedSubscriptionId }: any) => (
    <div data-testid="subscription-dropdown" data-selected={selectedSubscriptionId}>
      <button type="button" data-testid="select-subscription" onClick={() => setSelectedSubscriptionId('subscription-2')}>
        Select
      </button>
    </div>
  ),
}));

vi.mock('../../connectionParameterRow', () => ({
  ConnectionParameterRow: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../formInputs/universalConnectionParameter', () => ({
  UniversalConnectionParameter: () => null,
}));

vi.mock('../styles', () => ({
  useStyles: () => ({}),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <IntlProvider locale="en">{children}</IntlProvider>;

const defaultProps: ConnectionParameterProps = {
  parameterKey: 'cosmosDbServiceAccountId',
  parameter: { type: 'string' },
  value: '',
  setValue: vi.fn(),
};

describe('CosmosDbConnector subscription state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllCosmosDbServiceAccounts.mockReturnValue({ isFetching: false, data: [], refetch: vi.fn() });
  });

  afterEach(cleanup);

  it('stores the selected subscription locally', () => {
    const selectSubscriptionCallback = vi.fn();
    const setValue = vi.fn();

    render(
      <CosmosDbConnector
        {...defaultProps}
        selectedSubscriptionId="subscription-1"
        selectSubscriptionCallback={selectSubscriptionCallback}
        setValue={setValue}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('subscription-dropdown')).toHaveAttribute('data-selected', '');
    expect(mockUseAllCosmosDbServiceAccounts).toHaveBeenCalledWith('');

    fireEvent.click(screen.getByTestId('select-subscription'));

    expect(screen.getByTestId('subscription-dropdown')).toHaveAttribute('data-selected', 'subscription-2');
    expect(mockUseAllCosmosDbServiceAccounts).toHaveBeenLastCalledWith('subscription-2');
    expect(selectSubscriptionCallback).not.toHaveBeenCalled();
    expect(setValue).toHaveBeenCalledWith('');
  });
});
