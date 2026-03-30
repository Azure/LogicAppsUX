/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { basicsTab, getSelectedAuthIndex, comboboxStyles, dropdownStyles, secretFieldStyles } from '../tabs/basics';
import type { IntlShape } from 'react-intl';
import { IntlProvider } from 'react-intl';
import type { ConnectionParameterSets } from '@microsoft/logic-apps-shared';

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
  }),
}));

// Mock TemplatesSection
vi.mock('@microsoft/designer-ui', () => ({
  TemplatesSection: ({ title, description, items }: { title: string; description?: string; items: any[] }) => (
    <div data-testid="templates-section">
      <div data-testid="section-title">{title}</div>
      {description && <div data-testid="section-description">{description}</div>}
      {items.map((item, index) => (
        <div key={index} data-testid={`section-item-${index}`}>
          <label>{item.label}</label>
          <input
            data-testid={`input-${item.label?.toLowerCase().replace(/\s+/g, '-')}`}
            value={item.value || ''}
            placeholder={item.placeholder}
            onChange={(e) => item.onChange?.(e.target.value)}
          />
          {item.errorMessage && <span data-testid="error-message">{item.errorMessage}</span>}
        </div>
      ))}
    </div>
  ),
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
  UniversalConnectionParameter: ({ parameterKey, parameter, value, setValue }: any) => (
    <div data-testid={`param-${parameterKey}`}>
      <label>{parameter?.uiDefinition?.displayName || parameterKey}</label>
      <input data-testid={`param-input-${parameterKey}`} value={value || ''} onChange={(e) => setValue(e.target.value)} />
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

describe('basicsTab', () => {
  const mockIntl = {
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  } as IntlShape;

  const mockClose = vi.fn();
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
          endpoint: {
            type: 'string',
            uiDefinition: {
              displayName: 'Endpoint',
              description: 'Database endpoint',
              constraints: {},
            },
          },
        },
      },
      {
        name: 'key',
        uiDefinition: {
          displayName: 'Access Key',
          description: 'Use access key',
        },
        parameters: {
          endpoint: {
            type: 'string',
            uiDefinition: {
              displayName: 'Endpoint',
              description: 'Database endpoint',
              constraints: {},
            },
          },
          key: {
            type: 'securestring',
            uiDefinition: {
              displayName: 'Access Key',
              description: 'Database access key',
              constraints: {},
            },
          },
        },
      },
    ],
  };

  const defaultConnectionParams = {
    displayName: '',
    cosmosDBAuthenticationType: 'managedIdentity',
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    const result = basicsTab(
      mockIntl,
      mockClose,
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

    expect(result.id).toBe('BASICS');
  });

  it('returns tab with correct title', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

    expect(result.title).toBe('Basics');
  });

  it('returns tab with disabled state when isCreating is true', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  it('returns footerContent with Close and Next buttons', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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
    expect(result.footerContent?.buttonContents[0].text).toBe('Close');
    expect(result.footerContent?.buttonContents[1].text).toBe('Next');
  });

  it('Close button calls close callback when clicked', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

    expect(mockClose).toHaveBeenCalled();
  });

  it('Next button calls onPrimaryButtonClick when clicked', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  it('Next button is disabled when isPrimaryButtonDisabled is true', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  it('Next button is disabled when isCreating is true', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  it('Close button is disabled when isCreating is true', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

    expect(result.footerContent?.buttonContents[0].disabled).toBe(true);
  });

  it('Next button has primary appearance', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  it('Next button onClick handles undefined onPrimaryButtonClick gracefully', () => {
    const result = basicsTab(
      mockIntl,
      mockClose,
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

  describe('Basics Component (rendered via basicsTab)', () => {
    const renderBasicsTab = (connectionParams = defaultConnectionParams, isCreating = false) => {
      const tab = basicsTab(
        mockIntl,
        mockClose,
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

    it('renders Details section with correct title', () => {
      renderBasicsTab();

      expect(screen.getByTestId('section-title')).toHaveTextContent('Details');
    });

    it('renders Details section with description', () => {
      renderBasicsTab();

      expect(screen.getByTestId('section-description')).toBeInTheDocument();
    });

    it('renders Database section title', () => {
      renderBasicsTab();

      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('renders connection multi auth input', () => {
      renderBasicsTab();

      expect(screen.getByTestId('connection-multi-auth')).toBeInTheDocument();
    });

    it('renders parameter inputs for visible parameters', () => {
      renderBasicsTab();

      expect(screen.getByTestId('param-endpoint')).toBeInTheDocument();
    });

    it('displays name input with placeholder', () => {
      renderBasicsTab();

      const nameInput = screen.getByTestId('input-display-name');
      expect(nameInput).toHaveAttribute('placeholder', 'Enter a display name for your connection.');
    });

    it('updates name when input changes', () => {
      renderBasicsTab();

      const nameInput = screen.getByTestId('input-display-name');
      fireEvent.change(nameInput, { target: { value: 'My Connection' } });

      expect(mockSetConnectionParameterValues).toHaveBeenCalled();
    });

    it('shows name with initial value when provided', () => {
      renderBasicsTab({ ...defaultConnectionParams, displayName: 'Test Connection' });

      const nameInput = screen.getByTestId('input-display-name');
      expect(nameInput).toHaveValue('Test Connection');
    });
  });
});

describe('getSelectedAuthIndex', () => {
  const mockConnectionParameterSets: ConnectionParameterSets = {
    uiDefinition: {
      displayName: 'Authentication',
      description: 'Select authentication type',
    },
    values: [
      {
        name: 'managedIdentity',
        uiDefinition: { displayName: 'Managed Identity', description: '' },
        parameters: {},
      },
      {
        name: 'key',
        uiDefinition: { displayName: 'Access Key', description: '' },
        parameters: {},
      },
    ],
  };

  it('returns 0 when authType is undefined', () => {
    expect(getSelectedAuthIndex(mockConnectionParameterSets)).toBe(0);
  });

  it('returns 0 when authType is empty string', () => {
    expect(getSelectedAuthIndex(mockConnectionParameterSets, '')).toBe(0);
  });

  it('returns correct index when authType matches', () => {
    expect(getSelectedAuthIndex(mockConnectionParameterSets, 'key')).toBe(1);
  });

  it('returns correct index for first auth type', () => {
    expect(getSelectedAuthIndex(mockConnectionParameterSets, 'managedIdentity')).toBe(0);
  });

  it('returns 0 when authType does not match any parameter set', () => {
    expect(getSelectedAuthIndex(mockConnectionParameterSets, 'nonexistent')).toBe(0);
  });
});

describe('Style objects', () => {
  it('comboboxStyles has root property', () => {
    expect(comboboxStyles).toHaveProperty('root');
  });

  it('dropdownStyles has required properties', () => {
    expect(dropdownStyles).toHaveProperty('dropdown');
    expect(dropdownStyles).toHaveProperty('caretDown');
    expect(dropdownStyles).toHaveProperty('dropdownOptionText');
    expect(dropdownStyles).toHaveProperty('title');
    expect(dropdownStyles).toHaveProperty('root');
  });

  it('secretFieldStyles has fieldGroup property', () => {
    expect(secretFieldStyles).toHaveProperty('fieldGroup');
  });
});
