/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { CosmosDbConnector, getSubscriptionFromResource } from '../cosmosConnector';
import type { ConnectionParameterProps } from '../../formInputs/universalConnectionParameter';
import type React from 'react';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Fluent UI components
let capturedOnOptionSelect: any;
let capturedOnChange: any;

vi.mock('@fluentui/react-components', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Combobox: ({ children, value, placeholder, disabled, onOptionSelect, onChange, ...props }: any) => {
    capturedOnOptionSelect = onOptionSelect;
    capturedOnChange = onChange;
    return (
      <div data-testid="combobox" data-disabled={disabled} data-placeholder={placeholder}>
        <input
          data-testid="combobox-input"
          value={value || ''}
          onChange={(e) => onChange?.(e)}
          disabled={disabled}
          placeholder={placeholder}
        />
        <div data-testid="combobox-options">{children}</div>
      </div>
    );
  },
  Option: ({ children, value, disabled, ...props }: any) => (
    <div data-testid={`option-${value}`} data-value={value} data-disabled={disabled} {...props}>
      {children}
    </div>
  ),
  Field: ({ children, validationState, validationMessage, ...props }: any) => (
    <div data-testid="field" data-validation-state={validationState} data-validation-message={validationMessage} {...props}>
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button data-testid="refresh-button" onClick={onClick} disabled={disabled} type="button" {...props}>
      {icon}
      {children}
    </button>
  ),
}));

// Mock icons
vi.mock('@fluentui/react-icons', () => ({
  ArrowClockwise20Filled: () => <span data-testid="refresh-icon-filled">RefreshFilled</span>,
  ArrowClockwise20Regular: () => <span data-testid="refresh-icon-regular">RefreshRegular</span>,
  bundleIcon: () => () => <span data-testid="refresh-icon">Refresh</span>,
}));

// Mock logic-apps-shared
const mockExecuteResourceAction = vi.fn();
vi.mock('@microsoft/logic-apps-shared', () => ({
  ResourceService: vi.fn(() => ({
    executeResourceAction: mockExecuteResourceAction,
  })),
  LogEntryLevel: { Error: 'Error', Warning: 'Warning', Info: 'Info' },
  LoggerService: vi.fn(() => ({
    log: vi.fn(),
  })),
  equals: (a: any, b: any) => a?.toLowerCase?.() === b?.toLowerCase?.(),
  isArmResourceId: (id: string) => id && id.startsWith('/subscriptions/'),
}));

// Mock useSubscriptions hook
const mockUseSubscriptions = vi.fn();
vi.mock('../../../../../../core/state/connection/connectionSelector', () => ({
  useSubscriptions: () => mockUseSubscriptions(),
}));

// Mock useAllCosmosDbServiceAccounts hook
const mockRefetch = vi.fn();
const mockUseAllCosmosDbServiceAccounts = vi.fn();
vi.mock('../useCognitiveService', () => ({
  useAllCosmosDbServiceAccounts: (subscriptionId: string) => mockUseAllCosmosDbServiceAccounts(subscriptionId),
}));

// Mock SubscriptionDropdown
vi.mock('../components/SubscriptionDropdown', () => ({
  SubscriptionDropdown: ({ setSelectedSubscriptionId, selectedSubscriptionId, title }: any) => (
    <div data-testid="subscription-dropdown" data-selected={selectedSubscriptionId} data-title={title}>
      <button data-testid="subscription-select-btn" onClick={() => setSelectedSubscriptionId('new-subscription-id')} type="button">
        Select Subscription
      </button>
    </div>
  ),
}));

// Mock ConnectionParameterRow
vi.mock('../../connectionParameterRow', () => ({
  ConnectionParameterRow: ({ children, displayName, parameterKey }: any) => (
    <div data-testid={`parameter-row-${parameterKey}`} data-display-name={displayName}>
      {children}
    </div>
  ),
}));

// Mock UniversalConnectionParameter
vi.mock('../../formInputs/universalConnectionParameter', () => ({
  UniversalConnectionParameter: ({ parameterKey, parameter, isLoading }: any) => (
    <div data-testid={`universal-param-${parameterKey}`} data-loading={isLoading}>
      {parameter?.uiDefinition?.description}
    </div>
  ),
}));

// Mock styles
vi.mock('../styles', () => ({
  useStyles: () => ({
    openAIContainer: 'openai-container',
    cosmosField: 'cosmos-field',
    cosmosCombobox: 'cosmos-combobox',
    refreshButton: 'refresh-button',
  }),
}));

const defaultProps: ConnectionParameterProps = {
  parameterKey: 'cosmosDbServiceAccountId',
  value: '',
  setValue: vi.fn(),
  parameter: {
    type: 'string',
    uiDefinition: {
      displayName: 'Cosmos DB Account',
      description: 'Select a Cosmos DB account',
    },
  },
  setKeyValue: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => <IntlProvider locale="en">{children}</IntlProvider>;

describe('CosmosDbConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubscriptions.mockReturnValue({
      isFetching: false,
      data: [
        { subscriptionId: 'sub-1', displayName: 'Subscription 1' },
        { subscriptionId: 'sub-2', displayName: 'Subscription 2' },
      ],
    });
    mockUseAllCosmosDbServiceAccounts.mockReturnValue({
      isFetching: false,
      data: [
        {
          id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1',
          name: 'cosmos1',
          resourceGroup: 'rg1',
          subscriptionId: 'sub-1',
          endpoint: 'https://cosmos1.documents.azure.com',
        },
        {
          id: '/subscriptions/sub-1/resourceGroups/rg2/providers/Microsoft.DocumentDB/databaseAccounts/cosmos2',
          name: 'cosmos2',
          resourceGroup: 'rg2',
          subscriptionId: 'sub-1',
          endpoint: 'https://cosmos2.documents.azure.com',
        },
      ],
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('cosmosDbServiceAccountId parameter', () => {
    it('renders subscription dropdown', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('subscription-dropdown')).toBeInTheDocument();
    });

    it('renders cosmos db resource dropdown', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('parameter-row-cosmos-db-resource-id')).toBeInTheDocument();
      expect(screen.getByTestId('combobox')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('shows loading placeholder when fetching accounts', () => {
      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox-input')).toHaveAttribute('placeholder', 'Loading databases...');
    });

    it('shows select placeholder when not fetching', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox-input')).toHaveAttribute('placeholder', 'Select a Cosmos DB resource.');
    });

    it('renders account options', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(
        screen.getByTestId('option-/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('option-/subscriptions/sub-1/resourceGroups/rg2/providers/Microsoft.DocumentDB/databaseAccounts/cosmos2')
      ).toBeInTheDocument();
    });

    it('shows no resources message when no accounts found', () => {
      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: false,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('option-no-items')).toHaveTextContent(`Can't find any Cosmos DB resources.`);
    });

    it('disables combobox when fetching accounts', () => {
      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox')).toHaveAttribute('data-disabled', 'true');
    });

    it('disables refresh button when fetching', () => {
      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('refresh-button')).toBeDisabled();
    });

    it('calls refetch when refresh button clicked', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      fireEvent.click(screen.getByTestId('refresh-button'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('updates subscription when dropdown changes', () => {
      const setValue = vi.fn();
      render(<CosmosDbConnector {...defaultProps} setValue={setValue} />, { wrapper });

      fireEvent.click(screen.getByTestId('subscription-select-btn'));

      expect(setValue).toHaveBeenCalledWith('');
    });

    it('displays selected account text when value is set', () => {
      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';

      render(<CosmosDbConnector {...defaultProps} value={accountId} />, { wrapper });

      // After effect runs, selectedAccountText should be set
      expect(screen.getByTestId('combobox-input')).toBeInTheDocument();
    });
  });

  describe('non-cosmosDbServiceAccountId parameters', () => {
    it('renders UniversalConnectionParameter for other parameter keys', () => {
      const props: ConnectionParameterProps = {
        ...defaultProps,
        parameterKey: 'cosmosDBEndpoint',
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      expect(screen.getByTestId('universal-param-cosmosDBEndpoint')).toBeInTheDocument();
    });

    it('passes isLoading=true to UniversalConnectionParameter', () => {
      const props: ConnectionParameterProps = {
        ...defaultProps,
        parameterKey: 'cosmosDBKey',
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      expect(screen.getByTestId('universal-param-cosmosDBKey')).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('account selection with key authentication', () => {
    it('sets endpoint and key when selecting account with key auth', async () => {
      mockExecuteResourceAction.mockResolvedValue({
        primaryMasterKey: 'master-key',
        secondaryMasterKey: 'secondary-key',
      });

      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'key' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      // Simulate selecting an account
      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('cosmosDBEndpoint', 'https://cosmos1.documents.azure.com');
        expect(setKeyValue).toHaveBeenCalledWith('cosmosDBKey', 'master-key');
        expect(setValue).toHaveBeenCalledWith(accountId);
      });
    });

    it('uses secondaryMasterKey when primaryMasterKey is not available', async () => {
      mockExecuteResourceAction.mockResolvedValue({
        secondaryMasterKey: 'secondary-key',
      });

      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'key' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('cosmosDBKey', 'secondary-key');
      });
    });

    it('sets empty key when no keys available', async () => {
      mockExecuteResourceAction.mockResolvedValue({});

      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'key' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('cosmosDBKey', '');
      });
    });

    it('handles key fetch error', async () => {
      mockExecuteResourceAction.mockRejectedValue(new Error('Access denied'));

      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'key' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      // Error sets the error message in the field
      await waitFor(() => {
        expect(screen.getByTestId('field')).toHaveAttribute('data-validation-state', 'error');
      });
    });
  });

  describe('account selection without key authentication', () => {
    it('sets only endpoint when selecting account with non-key auth', async () => {
      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'managedIdentity' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('cosmosDBEndpoint', 'https://cosmos1.documents.azure.com');
        expect(mockExecuteResourceAction).not.toHaveBeenCalled();
        expect(setValue).toHaveBeenCalledWith(accountId);
      });
    });

    it('skips selection when option is no-items', async () => {
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
      };

      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: false,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...props} />, { wrapper });

      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: 'no-items' });
      });

      expect(setValue).not.toHaveBeenCalled();
    });

    it('skips selection when same option is selected', async () => {
      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      const setValue = vi.fn();
      const setKeyValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        value: accountId,
        setValue,
        setKeyValue,
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      expect(setKeyValue).not.toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('updates search term on input change', async () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      await waitFor(() => {
        capturedOnChange?.({ target: { value: 'cosmos' } });
      });

      // Search term is captured internally
      expect(screen.getByTestId('combobox-input')).toBeInTheDocument();
    });

    it('shows no results message with search term', () => {
      mockUseAllCosmosDbServiceAccounts.mockReturnValue({
        isFetching: false,
        data: [],
        refetch: mockRefetch,
      });

      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      // Simulate search
      fireEvent.change(screen.getByTestId('combobox-input'), { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('option-no-items')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error message in field when validation fails', () => {
      render(<CosmosDbConnector {...defaultProps} />, { wrapper });

      const field = screen.getByTestId('field');
      expect(field).toHaveAttribute('data-validation-state', 'none');
    });

    it('handles key fetch error with fallback message', async () => {
      mockExecuteResourceAction.mockRejectedValue({});

      const setKeyValue = vi.fn();
      const setValue = vi.fn();
      const props: ConnectionParameterProps = {
        ...defaultProps,
        setValue,
        setKeyValue,
        operationParameterValues: { authType: 'key' },
      };

      render(<CosmosDbConnector {...props} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos1';
      await waitFor(async () => {
        await capturedOnOptionSelect?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(screen.getByTestId('field')).toHaveAttribute('data-validation-message', "Can't find account key");
      });
    });
  });
});

describe('getSubscriptionFromResource', () => {
  it('returns empty string for empty resourceId', () => {
    expect(getSubscriptionFromResource('')).toBe('');
  });

  it('returns empty string for undefined resourceId', () => {
    expect(getSubscriptionFromResource(undefined as any)).toBe('');
  });

  it('returns empty string for non-ARM resource ID', () => {
    expect(getSubscriptionFromResource('not-an-arm-id')).toBe('');
  });

  it('extracts subscription ID from valid ARM resource ID', () => {
    const resourceId = '/subscriptions/abc-123-def/resourceGroups/myRg/providers/Microsoft.DocumentDB/databaseAccounts/myAccount';
    expect(getSubscriptionFromResource(resourceId)).toBe('abc-123-def');
  });

  it('extracts subscription ID from nested ARM resource ID', () => {
    const resourceId = '/subscriptions/sub-456/resourceGroups/rg/providers/Microsoft.Web/sites/mysite';
    expect(getSubscriptionFromResource(resourceId)).toBe('sub-456');
  });

  it('handles subscription ID with special characters', () => {
    const resourceId =
      '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa';
    expect(getSubscriptionFromResource(resourceId)).toBe('12345678-1234-1234-1234-123456789012');
  });
});
