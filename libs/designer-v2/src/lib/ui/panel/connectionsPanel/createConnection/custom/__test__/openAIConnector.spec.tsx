/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { CustomOpenAIConnector } from '../openAIConnector';
import type { ConnectionParameterProps } from '../../formInputs/universalConnectionParameter';
import type React from 'react';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Capture onOptionSelect handlers per automation-id
const capturedOnOptionSelect: Record<string, any> = {};

vi.mock('@fluentui/react-components', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Combobox: ({ children, value, placeholder, disabled, onOptionSelect, ...props }: any) => {
    const automationId = props['data-automation-id'] ?? 'default';
    capturedOnOptionSelect[automationId] = onOptionSelect;
    return (
      <div data-testid={`combobox-${automationId}`} data-disabled={disabled} data-placeholder={placeholder}>
        <input data-testid={`combobox-input-${automationId}`} value={value || ''} disabled={disabled} placeholder={placeholder} readOnly />
        <div data-testid={`combobox-options-${automationId}`}>{children}</div>
      </div>
    );
  },
  Option: ({ children, value, ...props }: any) => (
    <div data-testid={`option-${value}`} data-value={value} {...props}>
      {children}
    </div>
  ),
  OptionGroup: ({ children, label, ...props }: any) => (
    <div data-testid={`option-group-${label}`} {...props}>
      {children}
    </div>
  ),
  Field: ({ children, validationState, validationMessage, validationMessageIcon, ...props }: any) => (
    <div data-testid="field" data-validation-state={validationState} data-validation-message={validationMessage} {...props}>
      {validationMessageIcon}
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button
      data-testid={`button-${props['data-automation-id'] ?? 'refresh'}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
  Spinner: ({ label, ...props }: any) => (
    <div data-testid="spinner" data-label={label} {...props}>
      {label}
    </div>
  ),
  Text: ({ children, ...props }: any) => (
    <span data-testid="text" {...props}>
      {children}
    </span>
  ),
}));

vi.mock('@fluentui/react-icons', () => ({
  ArrowClockwise16Filled: () => <span>RefreshFilled</span>,
  ArrowClockwise16Regular: () => <span>RefreshRegular</span>,
  bundleIcon: () => () => <span data-testid="refresh-icon">Refresh</span>,
}));

// Mock logic-apps-shared
const mockFetchAccountById = vi.fn();
const mockFetchAccountKeysById = vi.fn();
vi.mock('@microsoft/logic-apps-shared', () => ({
  CognitiveServiceService: vi.fn(() => ({
    fetchCognitiveServiceAccountById: mockFetchAccountById,
    fetchCognitiveServiceAccountKeysById: mockFetchAccountKeysById,
  })),
  LogEntryLevel: { Error: 'Error', Warning: 'Warning', Info: 'Info' },
  LoggerService: vi.fn(() => ({
    log: vi.fn(),
  })),
  equals: (a: any, b: any, ignoreCase?: boolean) => {
    if (ignoreCase) return a?.toLowerCase?.() === b?.toLowerCase?.();
    return a === b;
  },
  isUndefinedOrEmptyString: (val: any) => val === undefined || val === null || val === '',
}));

vi.mock('@microsoft/designer-ui', () => ({
  NavigateIcon: (props: any) => <span data-testid="navigate-icon" {...props} />,
}));

// Mock hooks
const mockUseSubscriptions = vi.fn();
vi.mock('../../../../../../core/state/connection/connectionSelector', () => ({
  useSubscriptions: () => mockUseSubscriptions(),
}));

const mockRefetchServiceAccounts = vi.fn();
const mockRefetchServiceProjects = vi.fn();
const mockRefetchAPIMAccounts = vi.fn();
const mockRefetchAPIMAccountApis = vi.fn();
const mockUseAllCognitiveServiceAccounts = vi.fn();
const mockUseAllCognitiveServiceProjects = vi.fn();
const mockUseAllAPIMServiceAccounts = vi.fn();
const mockUseAllAPIMServiceAccountsApis = vi.fn();

vi.mock('../useCognitiveService', () => ({
  useAllCognitiveServiceAccounts: (...args: any[]) => mockUseAllCognitiveServiceAccounts(...args),
  useAllCognitiveServiceProjects: (...args: any[]) => mockUseAllCognitiveServiceProjects(...args),
  useAllAPIMServiceAccounts: (...args: any[]) => mockUseAllAPIMServiceAccounts(...args),
  useAllAPIMServiceAccountsApis: (...args: any[]) => mockUseAllAPIMServiceAccountsApis(...args),
}));

const mockUseHasRoleAssignmentsWritePermissionQuery = vi.fn();
const mockUseHasRoleDefinitionsByNameQuery = vi.fn();
vi.mock('../../../../../../core/queries/role', () => ({
  useHasRoleAssignmentsWritePermissionQuery: (...args: any[]) => mockUseHasRoleAssignmentsWritePermissionQuery(...args),
  useHasRoleDefinitionsByNameQuery: (...args: any[]) => mockUseHasRoleDefinitionsByNameQuery(...args),
}));

vi.mock('../components/SubscriptionDropdown', () => ({
  SubscriptionDropdown: ({ setSelectedSubscriptionId, selectedSubscriptionId, title }: any) => (
    <div data-testid="subscription-dropdown" data-selected={selectedSubscriptionId} data-title={title}>
      <button data-testid="subscription-select-btn" onClick={() => setSelectedSubscriptionId('sub-1')} type="button">
        Select Subscription
      </button>
    </div>
  ),
}));

vi.mock('../../connectionParameterRow', () => ({
  ConnectionParameterRow: ({ children, displayName, parameterKey }: any) => (
    <div data-testid={`parameter-row-${parameterKey}`} data-display-name={displayName}>
      {children}
    </div>
  ),
}));

vi.mock('../../formInputs/universalConnectionParameter', () => ({
  UniversalConnectionParameter: ({ parameterKey, parameter, isLoading }: any) => (
    <div data-testid={`universal-param-${parameterKey}`} data-loading={isLoading}>
      {parameter?.uiDefinition?.description}
    </div>
  ),
}));

vi.mock('../styles', () => ({
  useStyles: () => ({
    openAIContainer: 'openai-container',
    comboxbox: 'comboxbox',
    openAICombobox: 'openai-combobox',
    comboboxFooter: 'combobox-footer',
    createNewButton: 'create-new-button',
  }),
}));

vi.mock('../../../../../../common/constants', () => ({
  default: { LINKS: { APIM_LEARN_MORE: 'https://aka.ms/logicapps-apimdocs' } },
}));

const defaultProps: ConnectionParameterProps = {
  parameterKey: 'cognitiveServiceAccountId',
  value: '',
  setValue: vi.fn(),
  parameter: {
    type: 'string',
    uiDefinition: {
      displayName: 'Cognitive Service Account',
      description: 'Select a cognitive service account',
    },
  },
  setKeyValue: vi.fn(),
  operationParameterValues: { agentModelType: 'AzureOpenAI' },
};

const wrapper = ({ children }: { children: React.ReactNode }) => <IntlProvider locale="en">{children}</IntlProvider>;

const setupDefaultMocks = () => {
  mockUseSubscriptions.mockReturnValue({
    isFetching: false,
    data: [
      { subscriptionId: 'sub-1', displayName: 'Subscription 1' },
      { subscriptionId: 'sub-2', displayName: 'Subscription 2' },
    ],
  });
  mockUseAllCognitiveServiceAccounts.mockReturnValue({
    isFetching: false,
    data: [
      {
        id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1',
        name: 'openai1',
        resourceGroup: 'rg1',
      },
      {
        id: '/subscriptions/sub-1/resourceGroups/rg2/providers/Microsoft.CognitiveServices/accounts/openai2',
        name: 'openai2',
        resourceGroup: 'rg2',
      },
    ],
    refetch: mockRefetchServiceAccounts,
  });
  mockUseAllCognitiveServiceProjects.mockReturnValue({
    isFetching: false,
    data: [],
    refetch: mockRefetchServiceProjects,
  });
  mockUseAllAPIMServiceAccounts.mockReturnValue({
    isFetching: false,
    data: [],
    refetch: mockRefetchAPIMAccounts,
  });
  mockUseAllAPIMServiceAccountsApis.mockReturnValue({
    isFetching: false,
    data: [],
    refetch: mockRefetchAPIMAccountApis,
  });
  mockUseHasRoleAssignmentsWritePermissionQuery.mockReturnValue({ data: false, isFetching: false });
  mockUseHasRoleDefinitionsByNameQuery.mockReturnValue({ data: false, isFetching: false });
};

describe('CustomOpenAIConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('AzureOpenAI — cognitiveServiceAccountId parameter', () => {
    it('renders subscription dropdown and resource combobox', () => {
      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('subscription-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-row-cognitive-service-resource-id')).toBeInTheDocument();
      expect(screen.getByTestId('combobox-openai-combobox')).toBeInTheDocument();
    });

    it('shows "Loading accounts..." placeholder when fetching', () => {
      mockUseAllCognitiveServiceAccounts.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetchServiceAccounts,
      });

      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox-input-openai-combobox')).toHaveAttribute('placeholder', 'Loading accounts...');
    });

    it('shows "Select an Azure OpenAI resource" placeholder when ready', () => {
      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox-input-openai-combobox')).toHaveAttribute('placeholder', 'Select an Azure OpenAI resource');
    });

    it('renders account options with name (/resourceGroup) format', () => {
      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      const option1 = screen.getByTestId(
        'option-/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1'
      );
      expect(option1).toHaveTextContent('openai1 (/rg1)');

      const option2 = screen.getByTestId(
        'option-/subscriptions/sub-1/resourceGroups/rg2/providers/Microsoft.CognitiveServices/accounts/openai2'
      );
      expect(option2).toHaveTextContent('openai2 (/rg2)');
    });

    it('disables combobox when fetching or no subscription', () => {
      mockUseAllCognitiveServiceAccounts.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetchServiceAccounts,
      });

      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      expect(screen.getByTestId('combobox-openai-combobox')).toHaveAttribute('data-disabled', 'true');
    });

    it('calls refetchServiceAccounts when refresh button is clicked', async () => {
      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      // First select a subscription so the refresh button becomes enabled
      await act(async () => {
        fireEvent.click(screen.getByTestId('subscription-select-btn'));
      });

      const refreshBtn = screen.getByTestId('button-refresh');
      fireEvent.click(refreshBtn);

      expect(mockRefetchServiceAccounts).toHaveBeenCalled();
    });

    it('calls setKeyValue for endpoint and key on account selection', async () => {
      mockFetchAccountById.mockResolvedValue({ properties: { endpoint: 'https://openai1.openai.azure.com/' } });
      mockFetchAccountKeysById.mockResolvedValue({ key1: 'test-key-123' });

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...defaultProps} setKeyValue={setKeyValue} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await waitFor(async () => {
        await capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('openAIEndpoint', 'https://openai1.openai.azure.com/');
        expect(setKeyValue).toHaveBeenCalledWith('openAIKey', 'test-key-123');
      });
    });

    it('calls CognitiveServiceService on account selection to fetch endpoint', async () => {
      mockFetchAccountById.mockRejectedValue(new Error('Endpoint fetch failed'));
      mockFetchAccountKeysById.mockResolvedValue({ key1: 'test-key' });

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...defaultProps} setKeyValue={setKeyValue} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await act(async () => {
        capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
        await new Promise((r) => setTimeout(r, 50));
      });

      // Verify the service was called
      expect(mockFetchAccountById).toHaveBeenCalledWith(accountId);
    });

    it('calls CognitiveServiceService on account selection to fetch key', async () => {
      mockFetchAccountById.mockResolvedValue({ properties: { endpoint: 'https://openai1.openai.azure.com/' } });
      mockFetchAccountKeysById.mockRejectedValue(new Error('Key fetch failed'));

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...defaultProps} setKeyValue={setKeyValue} />, { wrapper });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await act(async () => {
        capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
        await new Promise((r) => setTimeout(r, 50));
      });

      // Verify the service was called
      expect(mockFetchAccountKeysById).toHaveBeenCalledWith(accountId);
    });

    it('shows "Create new" link', () => {
      render(<CustomOpenAIConnector {...defaultProps} />, { wrapper });

      const links = screen.getAllByRole('link');
      const createNewLink = links.find((l) => l.textContent?.includes('Create new'));
      expect(createNewLink).toBeInTheDocument();
      expect(createNewLink).toHaveAttribute('href', 'https://aka.ms/openAICreate');
    });
  });

  describe('MicrosoftFoundry — cognitiveServiceAccountId parameter', () => {
    it('renders same resource combobox as AzureOpenAI', () => {
      render(<CustomOpenAIConnector {...defaultProps} operationParameterValues={{ agentModelType: 'MicrosoftFoundry' }} />, { wrapper });

      expect(screen.getByTestId('parameter-row-cognitive-service-resource-id')).toBeInTheDocument();
      expect(screen.getByTestId('combobox-openai-combobox')).toBeInTheDocument();
    });

    it('calls useAllCognitiveServiceAccounts with enabled=true', () => {
      render(<CustomOpenAIConnector {...defaultProps} operationParameterValues={{ agentModelType: 'MicrosoftFoundry' }} />, { wrapper });

      expect(mockUseAllCognitiveServiceAccounts).toHaveBeenCalledWith('', true);
    });
  });

  describe('FoundryAgentService — cognitiveServiceAccountId parameter', () => {
    const foundryProps = {
      ...defaultProps,
      operationParameterValues: { agentModelType: 'FoundryAgentService' },
    };

    beforeEach(() => {
      mockUseAllCognitiveServiceProjects.mockReturnValue({
        isFetching: false,
        data: [
          {
            id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/acct1/projects/proj1',
            name: 'acct1/proj1',
            resourceGroup: 'rg1',
          },
          {
            id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/acct1/projects/proj2',
            name: 'acct1/proj2',
            resourceGroup: 'rg1',
          },
          {
            id: '/subscriptions/sub-1/resourceGroups/rg2/providers/Microsoft.CognitiveServices/accounts/acct2/projects/proj3',
            name: 'acct2/proj3',
            resourceGroup: 'rg2',
          },
        ],
        refetch: mockRefetchServiceProjects,
      });
    });

    it('renders project combobox instead of resource combobox', () => {
      render(<CustomOpenAIConnector {...foundryProps} />, { wrapper });

      expect(screen.getByTestId('parameter-row-cognitive-service-project-name')).toBeInTheDocument();
      expect(screen.getByTestId('combobox-openai-project-combobox')).toBeInTheDocument();
    });

    it('shows "Loading AI Foundry projects..." when fetching', () => {
      mockUseAllCognitiveServiceProjects.mockReturnValue({
        isFetching: true,
        data: [],
        refetch: mockRefetchServiceProjects,
      });

      render(<CustomOpenAIConnector {...foundryProps} />, { wrapper });

      expect(screen.getByTestId('combobox-input-openai-project-combobox')).toHaveAttribute('placeholder', 'Loading AI Foundry projects...');
    });

    it('renders options grouped by account via OptionGroup', () => {
      render(<CustomOpenAIConnector {...foundryProps} />, { wrapper });

      expect(screen.getByTestId('option-group-acct1')).toBeInTheDocument();
      expect(screen.getByTestId('option-group-acct2')).toBeInTheDocument();
    });

    it('project selection computes endpoint and calls setKeyValue', async () => {
      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...foundryProps} setKeyValue={setKeyValue} />, { wrapper });

      const projectId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/acct1/projects/proj1';
      await waitFor(async () => {
        await capturedOnOptionSelect['openai-project-combobox']?.({}, { optionValue: projectId });
      });

      await waitFor(() => {
        expect(setKeyValue).toHaveBeenCalledWith('openAIEndpoint', 'https://acct1.services.ai.azure.com/api/projects/proj1');
      });
    });

    it('shows "Create new" link to Foundry project', () => {
      render(<CustomOpenAIConnector {...foundryProps} />, { wrapper });

      const links = screen.getAllByRole('link');
      const createNewLink = links.find((l) => l.textContent?.includes('Create new'));
      expect(createNewLink).toBeInTheDocument();
      expect(createNewLink).toHaveAttribute('href', 'https://aka.ms/openFoundryProjectCreate');
    });
  });

  describe('APIMGenAIGateway — cognitiveServiceAccountId parameter', () => {
    const apimProps = {
      ...defaultProps,
      operationParameterValues: { agentModelType: 'APIMGenAIGateway' },
    };

    beforeEach(() => {
      mockUseAllAPIMServiceAccounts.mockReturnValue({
        isFetching: false,
        data: [
          {
            id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.ApiManagement/service/apim1',
            name: 'apim1',
            location: 'eastus',
          },
        ],
        refetch: mockRefetchAPIMAccounts,
      });
      mockUseAllAPIMServiceAccountsApis.mockReturnValue({
        isFetching: false,
        data: [{ id: '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.ApiManagement/service/apim1/apis/api1', name: 'api1' }],
        refetch: mockRefetchAPIMAccountApis,
      });
    });

    it('renders APIM account combobox and APIs combobox', () => {
      render(<CustomOpenAIConnector {...apimProps} />, { wrapper });

      expect(screen.getByTestId('parameter-row-apiManagementService')).toBeInTheDocument();
      expect(screen.getByTestId('combobox-apim-account-combobox')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-row-apiManagementServiceApis')).toBeInTheDocument();
      expect(screen.getByTestId('combobox-apim-account-apis-combobox')).toBeInTheDocument();
    });

    it('APIs combobox disabled until APIM account selected', () => {
      render(<CustomOpenAIConnector {...apimProps} />, { wrapper });

      // Initially apimAccount state is '', so APIs combobox should be disabled
      expect(screen.getByTestId('combobox-apim-account-apis-combobox')).toHaveAttribute('data-disabled', 'true');
    });

    it('renders APIM account options with location', () => {
      render(<CustomOpenAIConnector {...apimProps} />, { wrapper });

      const option = screen.getByTestId('option-/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.ApiManagement/service/apim1');
      expect(option).toHaveTextContent('apim1 (eastus)');
    });

    it('shows "Learn more" link', () => {
      render(<CustomOpenAIConnector {...apimProps} />, { wrapper });

      const links = screen.getAllByRole('link');
      const learnMoreLink = links.find((l) => l.textContent?.includes('Learn more'));
      expect(learnMoreLink).toBeInTheDocument();
      expect(learnMoreLink).toHaveAttribute('href', 'https://aka.ms/logicapps-apimdocs');
    });
  });

  describe('Non-cognitiveServiceAccountId parameters', () => {
    it('renders UniversalConnectionParameter for other param keys', () => {
      render(<CustomOpenAIConnector {...defaultProps} parameterKey="openAIEndpoint" />, { wrapper });

      expect(screen.getByTestId('universal-param-openAIEndpoint')).toBeInTheDocument();
    });

    it('disabled (isLoading=true) for AzureOpenAI (auto-filled)', () => {
      render(<CustomOpenAIConnector {...defaultProps} parameterKey="openAIEndpoint" />, { wrapper });

      expect(screen.getByTestId('universal-param-openAIEndpoint')).toHaveAttribute('data-loading', 'true');
    });

    it('enabled (isLoading=false) for V1ChatCompletionsService', () => {
      render(
        <CustomOpenAIConnector
          {...defaultProps}
          parameterKey="openAIEndpoint"
          operationParameterValues={{ agentModelType: 'V1ChatCompletionsService' }}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('universal-param-openAIEndpoint')).toHaveAttribute('data-loading', 'false');
    });

    it('disabled until cognitiveServiceAccountId set for APIMGenAIGateway', () => {
      render(
        <CustomOpenAIConnector
          {...defaultProps}
          parameterKey="openAIEndpoint"
          operationParameterValues={{ agentModelType: 'APIMGenAIGateway' }}
          parameterValues={{}}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('universal-param-openAIEndpoint')).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Role validation', () => {
    const roleProps = {
      ...defaultProps,
      parameter: {
        ...defaultProps.parameter,
        managedIdentitySettings: {
          requiredRoles: ['Cognitive Services OpenAI Contributor'],
        },
      },
    };

    it('shows spinner + "Fetching resource details..." when fetching role data', async () => {
      mockUseHasRoleAssignmentsWritePermissionQuery.mockReturnValue({ data: false, isFetching: true });
      mockUseHasRoleDefinitionsByNameQuery.mockReturnValue({ data: false, isFetching: true });

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...roleProps} setKeyValue={setKeyValue} />, { wrapper });

      // First select an account so cognitiveServiceAccountId is set and RoleMessages renders
      mockFetchAccountById.mockResolvedValue({ properties: { endpoint: 'https://openai1.openai.azure.com/' } });
      mockFetchAccountKeysById.mockResolvedValue({ key1: 'k' });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await waitFor(async () => {
        await capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        const field = screen.getByTestId('field');
        expect(field).toHaveAttribute('data-validation-state', 'warning');
        expect(field).toHaveAttribute('data-validation-message', 'Fetching resource details...');
      });
    });

    it('shows "Missing role write permissions" warning when no permissions', async () => {
      mockUseHasRoleAssignmentsWritePermissionQuery.mockReturnValue({ data: false, isFetching: false });
      mockUseHasRoleDefinitionsByNameQuery.mockReturnValue({ data: false, isFetching: false });

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...roleProps} setKeyValue={setKeyValue} />, { wrapper });

      mockFetchAccountById.mockResolvedValue({ properties: { endpoint: 'https://openai1.openai.azure.com/' } });
      mockFetchAccountKeysById.mockResolvedValue({ key1: 'k' });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await waitFor(async () => {
        await capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        const field = screen.getByTestId('field');
        expect(field).toHaveAttribute('data-validation-state', 'warning');
        expect(field).toHaveAttribute('data-validation-message', 'Missing role write permissions');
      });
    });

    it('hides role messages when has required roles', async () => {
      mockUseHasRoleAssignmentsWritePermissionQuery.mockReturnValue({ data: true, isFetching: false });
      mockUseHasRoleDefinitionsByNameQuery.mockReturnValue({ data: true, isFetching: false });

      const setKeyValue = vi.fn();
      render(<CustomOpenAIConnector {...roleProps} setKeyValue={setKeyValue} />, { wrapper });

      mockFetchAccountById.mockResolvedValue({ properties: { endpoint: 'https://openai1.openai.azure.com/' } });
      mockFetchAccountKeysById.mockResolvedValue({ key1: 'k' });

      const accountId = '/subscriptions/sub-1/resourceGroups/rg1/providers/Microsoft.CognitiveServices/accounts/openai1';
      await waitFor(async () => {
        await capturedOnOptionSelect['openai-combobox']?.({}, { optionValue: accountId });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('field')).not.toBeInTheDocument();
      });
    });
  });
});
