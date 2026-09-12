/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionParameterProps } from '../../formInputs/universalConnectionParameter';
import { CosmosDbConnector, getSubscriptionFromResource } from '../cosmosConnector';

let comboboxProps: any;
const executeResourceAction = vi.fn();
const log = vi.fn();

vi.mock('@fluentui/react-components', () => ({
  Button: ({ onClick, disabled, 'aria-label': ariaLabel }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      Refresh
    </button>
  ),
  Combobox: (props: any) => {
    comboboxProps = props;
    return <div>{props.children}</div>;
  },
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
  ResourceService: () => ({ executeResourceAction }),
  LogEntryLevel: { Error: 'Error' },
  LoggerService: () => ({ log }),
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

  it('refreshes accounts when loading is complete', () => {
    const refetch = vi.fn();
    mockUseAllCosmosDbServiceAccounts.mockReturnValue({ isFetching: false, data: [], refetch });
    render(<CosmosDbConnector {...defaultProps} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Fetching resource details...' }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it('selects an account and retrieves its key for key authentication.', async () => {
    const account = {
      id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/db',
      name: 'db',
      resourceGroup: 'rg',
      endpoint: 'https://db.documents.azure.com',
    };
    const setValue = vi.fn();
    const setKeyValue = vi.fn();
    executeResourceAction.mockResolvedValue({ primaryMasterKey: 'primary-key' });
    mockUseAllCosmosDbServiceAccounts.mockReturnValue({ isFetching: false, data: [account], refetch: vi.fn() });
    render(
      <CosmosDbConnector {...defaultProps} setValue={setValue} setKeyValue={setKeyValue} operationParameterValues={{ authType: 'key' }} />,
      { wrapper }
    );

    await act(() => comboboxProps.onOptionSelect(undefined, { optionValue: account.id }));

    expect(setKeyValue).toHaveBeenCalledWith('cosmosDBEndpoint', account.endpoint);
    expect(setKeyValue).toHaveBeenCalledWith('cosmosDBKey', 'primary-key');
    expect(setValue).toHaveBeenCalledWith(account.id);
  });

  it('logs and displays account key retrieval errors', async () => {
    const account = {
      id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/db',
      name: 'db',
      resourceGroup: 'rg',
      endpoint: 'https://db.documents.azure.com',
    };
    executeResourceAction.mockRejectedValue(new Error('Key unavailable'));
    mockUseAllCosmosDbServiceAccounts.mockReturnValue({ isFetching: false, data: [account], refetch: vi.fn() });
    render(<CosmosDbConnector {...defaultProps} operationParameterValues={{ authType: 'key' }} />, { wrapper });

    await act(() => comboboxProps.onOptionSelect(undefined, { optionValue: account.id }));

    expect(log).toHaveBeenCalledWith(expect.objectContaining({ area: 'agent-connection-account-key' }));
  });
});

describe('getSubscriptionFromResource', () => {
  it('extracts the subscription from an ARM resource ID', () => {
    expect(getSubscriptionFromResource('/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.DocumentDB/accounts/db')).toBe('sub-1');
  });

  it('returns an empty value for missing or invalid resource IDs', () => {
    expect(getSubscriptionFromResource('')).toBe('');
    expect(getSubscriptionFromResource('not-an-arm-id')).toBe('');
  });
});
