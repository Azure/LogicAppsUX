/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { modelTab } from '../tabs/model';
import type { IntlShape } from 'react-intl';
import { IntlProvider } from 'react-intl';
import type { ConnectionParameterSets } from '@microsoft/logic-apps-shared';

const { mockUseCompletionModels, mockUseEmbeddingModels } = vi.hoisted(() => ({
  mockUseCompletionModels: vi.fn(),
  mockUseEmbeddingModels: vi.fn(),
}));

vi.mock('../../../../../core/knowledge/utils/queries', () => ({
  useCompletionModels: mockUseCompletionModels,
  useEmbeddingModels: mockUseEmbeddingModels,
}));

// Mock ResizeObserver for JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock styles
vi.mock('../../styles', () => ({
  useCreatePanelStyles: () => ({
    container: 'mock-container',
    sectionItem: 'mock-section-item',
    paramField: 'mock-param-field',
    paramLabel: 'mock-param-label',
    dropdown: 'mock-dropdown',
    combobox: 'mock-combobox',
    disabledField: 'mock-disabled-field',
  }),
}));

// Mock ConnectionMultiAuthInput
vi.mock('../../../../panel/connectionsPanel/createConnection/formInputs/connectionMultiAuth', () => ({
  default: ({ value, onChange, connectionParameterSets }: any) => (
    <div data-testid="connection-multi-auth">
      <select data-testid="auth-dropdown" value={value} onChange={(e) => onChange(e, { key: parseInt(e.target.value) })}>
        {connectionParameterSets?.values?.map((set: any, index: number) => (
          <option key={index} value={index}>
            {set.name}
          </option>
        ))}
      </select>
    </div>
  ),
}));

// Mock UniversalConnectionParameter
vi.mock('../../../../panel/connectionsPanel/createConnection/formInputs/universalConnectionParameter', () => ({
  UniversalConnectionParameter: ({ parameterKey, parameter, value, setValue, setKeyValue, cssOverrides }: any) => (
    <div
      data-testid={`param-${parameterKey}`}
      data-field-class={cssOverrides?.field}
      data-options={JSON.stringify(parameter?.uiDefinition?.constraints?.allowedValues)}
    >
      <label>{parameter?.uiDefinition?.displayName || parameterKey}</label>
      <input data-testid={`param-input-${parameterKey}`} value={value || ''} onChange={(e) => setValue(e.target.value)} />
      {parameterKey === 'openAIEndpoint' ? (
        <button type="button" data-testid="change-resource" onClick={() => setKeyValue('cognitiveServiceAccountId', 'resource-2')}>
          Change resource
        </button>
      ) : null}
    </div>
  ),
}));

// Mock ConnectionParameterEditorService
vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    ConnectionParameterEditorService: () => ({
      getConnectionParameterEditor: () => null,
    }),
  };
});

describe('modelTab', () => {
  const mockIntl = {
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  } as IntlShape;

  const mockSelectTab = vi.fn();
  const mockSetConnectionParameterValues = vi.fn();
  const mockOnPrimaryButtonClick = vi.fn();

  const mockConnectionParameterSets: ConnectionParameterSets = {
    uiDefinition: {
      displayName: 'Authentication',
      description: 'Select authentication type',
    },
    values: [
      {
        name: 'managedIdentity',
        uiDefinition: {
          displayName: 'Managed Identity',
          description: 'Use managed identity',
        },
        parameters: {
          openAIEndpoint: {
            type: 'string',
            uiDefinition: {
              displayName: 'OpenAI Endpoint',
              description: 'OpenAI endpoint URL',
              constraints: {},
            },
          },
          openAICompletionsModel: {
            type: 'string',
            uiDefinition: {
              displayName: 'Completions Model',
              description: 'Model for completions',
              constraints: {},
            },
          },
          openAIEmbeddingsModel: {
            type: 'string',
            uiDefinition: {
              displayName: 'Embeddings Model',
              description: 'Model for embeddings',
              constraints: {},
            },
          },
        },
      },
      {
        name: 'key',
        uiDefinition: {
          displayName: 'API Key',
          description: 'Use API key',
        },
        parameters: {
          openAIEndpoint: {
            type: 'string',
            uiDefinition: {
              displayName: 'OpenAI Endpoint',
              description: 'OpenAI endpoint URL',
              constraints: {},
            },
          },
          openAIKey: {
            type: 'securestring',
            uiDefinition: {
              displayName: 'API Key',
              description: 'OpenAI API key',
              constraints: {},
            },
          },
          openAICompletionsModel: {
            type: 'string',
            uiDefinition: {
              displayName: 'Completions Model',
              description: 'Model for completions',
              constraints: {},
            },
          },
        },
      },
    ],
  };

  const defaultConnectionParams = {
    displayName: 'Test Connection',
    openAIAuthenticationType: 'managedIdentity',
    cognitiveServiceAccountId: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/openai',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompletionModels.mockReturnValue({
      data: [{ text: 'completion-deployment', value: 'completion-deployment' }],
      isSuccess: true,
    });
    mockUseEmbeddingModels.mockReturnValue({
      data: [{ text: 'embedding-deployment', value: 'embedding-deployment' }],
      isSuccess: true,
    });
    mockSetConnectionParameterValues.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        return fn({});
      }
      return fn;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('returns tab with correct id', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.id).toBe('MODEL');
  });

  it('returns tab with correct title', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.title).toBe('Model');
  });

  it('returns tab with disabled state when isCreating is true', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      true,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.disabled).toBe(true);
  });

  it('returns tab with tabStatusIcon from props', () => {
    const statusIcon = <span>✓</span>;
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: statusIcon,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.tabStatusIcon).toBe(statusIcon);
  });

  it('returns footerContent with Previous and Create buttons', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.footerContent?.buttonContents).toHaveLength(2);
    expect(result.footerContent?.buttonContents[0].text).toBe('Previous');
    expect(result.footerContent?.buttonContents[1].text).toBe('Create');
  });

  it('Previous button calls selectTab with BASICS when clicked', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    result.footerContent?.buttonContents[0].onClick?.();

    expect(mockSelectTab).toHaveBeenCalledWith('BASICS');
  });

  it('Create button calls onPrimaryButtonClick when clicked', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    result.footerContent?.buttonContents[1].onClick?.();

    expect(mockOnPrimaryButtonClick).toHaveBeenCalled();
  });

  it('Create button is disabled when isPrimaryButtonDisabled is true', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: true,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.footerContent?.buttonContents[1].disabled).toBe(true);
  });

  it('Create button is disabled when isCreating is true', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      true,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.footerContent?.buttonContents[1].disabled).toBe(true);
  });

  it('Create button shows "Creating..." text when isCreating is true', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      true,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.footerContent?.buttonContents[1].text).toBe('Creating...');
  });

  it('Create button has primary appearance', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: mockOnPrimaryButtonClick,
      }
    );

    expect(result.footerContent?.buttonContents[1].appearance).toBe('primary');
  });

  it('Create button onClick handles undefined onPrimaryButtonClick gracefully', () => {
    const result = modelTab(
      mockIntl,
      mockSelectTab,
      mockConnectionParameterSets,
      defaultConnectionParams,
      mockSetConnectionParameterValues,
      false,
      {
        isPrimaryButtonDisabled: false,
        tabStatusIcon: undefined,
        onPrimaryButtonClick: undefined,
      }
    );

    // Should not throw when called without onPrimaryButtonClick
    expect(() => result.footerContent?.buttonContents[1].onClick?.()).not.toThrow();
  });

  describe('Model Component (rendered via modelTab)', () => {
    const renderModelTab = (connectionParams: Record<string, any> = defaultConnectionParams, isCreating = false) => {
      const tab = modelTab(
        mockIntl,
        mockSelectTab,
        mockConnectionParameterSets,
        connectionParams,
        mockSetConnectionParameterValues,
        isCreating,
        {
          isPrimaryButtonDisabled: false,
          tabStatusIcon: undefined,
          onPrimaryButtonClick: mockOnPrimaryButtonClick,
        }
      );

      return render(<IntlProvider locale="en">{tab.content}</IntlProvider>);
    };

    it('renders description text', () => {
      renderModelTab();

      expect(screen.getByText('Set up a model for your knowledge base.')).toBeInTheDocument();
    });

    it('renders connection multi auth input', () => {
      renderModelTab();

      expect(screen.getByTestId('connection-multi-auth')).toBeInTheDocument();
    });

    it('renders parameter inputs for visible parameters', () => {
      renderModelTab();

      expect(screen.getByTestId('param-openAIEndpoint')).toBeInTheDocument();
      expect(screen.getByTestId('param-openAICompletionsModel')).toBeInTheDocument();
    });

    it('queries models for the selected resource and stores them in the matching parameter options', () => {
      renderModelTab();

      expect(mockUseCompletionModels).toHaveBeenCalledWith(defaultConnectionParams.cognitiveServiceAccountId);
      expect(mockUseEmbeddingModels).toHaveBeenCalledWith(defaultConnectionParams.cognitiveServiceAccountId);
      expect(screen.getByTestId('param-openAICompletionsModel')).toHaveAttribute(
        'data-options',
        JSON.stringify([{ text: 'completion-deployment', value: 'completion-deployment' }])
      );
      expect(screen.getByTestId('param-openAIEmbeddingsModel')).toHaveAttribute(
        'data-options',
        JSON.stringify([{ text: 'embedding-deployment', value: 'embedding-deployment' }])
      );
    });

    it('resets each unavailable model only after its resource query succeeds', async () => {
      let embeddingModelsLoaded = false;
      mockUseCompletionModels.mockImplementation((resourceId: string) => ({
        data: [
          {
            text: resourceId === 'resource-2' ? 'new-completion' : 'old-completion',
            value: resourceId === 'resource-2' ? 'new-completion' : 'old-completion',
          },
        ],
        isSuccess: true,
      }));
      mockUseEmbeddingModels.mockImplementation((resourceId: string) => ({
        data: [
          {
            text: resourceId === 'resource-2' ? 'new-embedding' : 'old-embedding',
            value: resourceId === 'resource-2' ? 'new-embedding' : 'old-embedding',
          },
        ],
        isSuccess: resourceId !== 'resource-2' || embeddingModelsLoaded,
      }));
      renderModelTab({
        ...defaultConnectionParams,
        openAICompletionsModel: 'old-completion',
        openAIEmbeddingsModel: 'old-embedding',
      });

      fireEvent.click(screen.getByTestId('change-resource'));

      await waitFor(() =>
        expect(mockSetConnectionParameterValues).toHaveBeenCalledWith(
          expect.objectContaining({ openAICompletionsModel: undefined, openAIEmbeddingsModel: 'old-embedding' })
        )
      );

      embeddingModelsLoaded = true;
      fireEvent.change(screen.getByTestId('param-input-openAIEndpoint'), { target: { value: 'updated endpoint' } });

      await waitFor(() =>
        expect(mockSetConnectionParameterValues).toHaveBeenCalledWith(
          expect.objectContaining({ openAICompletionsModel: undefined, openAIEmbeddingsModel: undefined })
        )
      );
    });

    it('changes auth type when dropdown is changed', () => {
      renderModelTab();

      const dropdown = screen.getByTestId('auth-dropdown');
      fireEvent.change(dropdown, { target: { value: '1' } });

      expect(mockSetConnectionParameterValues).toHaveBeenCalled();
    });
  });
});
