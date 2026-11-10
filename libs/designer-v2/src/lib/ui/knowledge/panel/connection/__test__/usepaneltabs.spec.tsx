/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { configureStore } from '@reduxjs/toolkit';
import { useCreateConnectionPanelTabs } from '../usepaneltabs';
import type React from 'react';

// Mock basicsTab and modelTab
const mockBasicsTab = vi.fn();
const mockModelTab = vi.fn();

vi.mock('../tabs/basics', () => ({
  basicsTab: (...args: any[]) => mockBasicsTab(...args),
  getSelectedAuthIndex: (connectionParameterSets: typeof mockCosmosDbParams, authType?: string) => {
    const index = connectionParameterSets.values.findIndex((parameterSet) => parameterSet.name === authType);
    return index >= 0 ? index : 0;
  },
}));

vi.mock('../tabs/model', () => ({
  modelTab: (...args: any[]) => mockModelTab(...args),
}));

// Mock connection utilities
const mockCreateOrUpdateConnection = vi.fn().mockResolvedValue({});
const mockCosmosDbParams = {
  uiDefinition: { displayName: 'Cosmos DB', description: '' },
  values: [
    {
      name: 'managedIdentity',
      uiDefinition: { displayName: '', description: '' },
      parameters: {
        cosmosDbServiceAccountId: { type: 'string', uiDefinition: { constraints: { required: 'true' } } },
        cosmosDBEndpoint: { type: 'string', uiDefinition: { constraints: { required: 'true' } } },
      },
    },
  ],
};
const mockOpenAIParams = {
  uiDefinition: { displayName: 'OpenAI', description: '' },
  values: [{ name: 'managedIdentity', uiDefinition: { displayName: '', description: '' }, parameters: {} }],
};

vi.mock('../../../../../core/knowledge/utils/connection', () => ({
  createOrUpdateConnection: (...args: any[]) => mockCreateOrUpdateConnection(...args),
  getCosmosDbConnectionParameters: () => mockCosmosDbParams,
  getOpenAIConnectionParameters: () => mockOpenAIParams,
}));

describe('useCreateConnectionPanelTabs Hook', () => {
  const mockSelectTab = vi.fn();
  const mockClose = vi.fn();
  const mockOnCreate = vi.fn();
  const mockOnError = vi.fn();

  const createMockStore = () => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => ({ isOpen: true }),
      },
    });
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createMockStore()}>
      <IntlProvider locale="en">{children}</IntlProvider>
    </Provider>
  );

  const renderUseCreateConnectionPanelTabs = () => {
    return renderHook(
      () => useCreateConnectionPanelTabs({ selectTab: mockSelectTab, close: mockClose, onCreate: mockOnCreate, onError: mockOnError }),
      { wrapper }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBasicsTab.mockReturnValue({
      id: 'BASICS',
      title: 'Basics',
      content: <div>Basics</div>,
      footerContent: { buttonContents: [] },
    });
    mockModelTab.mockReturnValue({
      id: 'MODEL',
      title: 'Model',
      content: <div>Model</div>,
      footerContent: { buttonContents: [] },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('returns an array of tabs', () => {
    const { result } = renderUseCreateConnectionPanelTabs();

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current).toHaveLength(2);
  });

  it('calls basicsTab with 7 arguments', () => {
    renderUseCreateConnectionPanelTabs();

    expect(mockBasicsTab).toHaveBeenCalledTimes(1);
    expect(mockBasicsTab.mock.calls[0]).toHaveLength(7);
  });

  it('passes cosmosDbConnectionParameters to basicsTab', () => {
    renderUseCreateConnectionPanelTabs();

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    // arg[2] is cosmosDbConnectionParameters
    expect(basicsTabCall[2]).toEqual(mockCosmosDbParams);
  });

  it('passes isCreating=false to basicsTab initially', () => {
    renderUseCreateConnectionPanelTabs();

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    // arg[5] is isCreating
    expect(basicsTabCall[5]).toBe(false);
  });

  it('passes correct props object to basicsTab', () => {
    renderUseCreateConnectionPanelTabs();

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    const props = basicsTabCall[6];
    expect(props).toMatchObject({
      isTabDisabled: false,
      isPrimaryButtonDisabled: true,
    });
    expect(typeof props.onPrimaryButtonClick).toBe('function');
  });

  it('calls modelTab with 7 arguments', () => {
    renderUseCreateConnectionPanelTabs();

    expect(mockModelTab).toHaveBeenCalledTimes(1);
    expect(mockModelTab.mock.calls[0]).toHaveLength(7);
  });

  it('passes openAIConnectionParameters to modelTab', () => {
    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    // arg[2] is openAIConnectionParameters
    expect(modelTabCall[2]).toEqual(mockOpenAIParams);
  });

  it('passes isCreating=false to modelTab initially', () => {
    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    // arg[5] is isCreating
    expect(modelTabCall[5]).toBe(false);
  });

  it('passes correct props object to modelTab', () => {
    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    const props = modelTabCall[6];
    expect(props).toMatchObject({
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });
    expect(typeof props.onPrimaryButtonClick).toBe('function');
  });

  it('returns basicsTab as first tab', () => {
    const { result } = renderUseCreateConnectionPanelTabs();

    expect(result.current[0].id).toBe('BASICS');
    expect(result.current[0].title).toBe('Basics');
  });

  it('returns modelTab as second tab', () => {
    const { result } = renderUseCreateConnectionPanelTabs();

    expect(result.current[1].id).toBe('MODEL');
    expect(result.current[1].title).toBe('Model');
  });

  it('handleMoveToModel calls selectTab with MODEL when required values are present', () => {
    renderUseCreateConnectionPanelTabs();

    act(() => {
      mockBasicsTab.mock.calls[0][4]({
        displayName: 'Knowledge Hub',
        cosmosDBAuthenticationType: 'managedIdentity',
        cosmosDbServiceAccountId: '/subscriptions/subscription-1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/db',
        cosmosDBEndpoint: 'https://db.documents.azure.com',
      });
    });
    const basicsTabProps = mockBasicsTab.mock.calls[mockBasicsTab.mock.calls.length - 1][6];

    expect(basicsTabProps.isPrimaryButtonDisabled).toBe(false);
    basicsTabProps.onPrimaryButtonClick();

    expect(mockSelectTab).toHaveBeenCalledWith('MODEL');
  });

  it('preserves the Cosmos DB subscription when navigating between tabs', () => {
    renderUseCreateConnectionPanelTabs();

    const initialBasicsTabProps = mockBasicsTab.mock.calls[0][6];
    act(() => {
      initialBasicsTabProps.selectSubscriptionCallback('subscription-1');
      initialBasicsTabProps.onPrimaryButtonClick();
    });

    const modelTabSelectTab = mockModelTab.mock.calls[mockModelTab.mock.calls.length - 1][1];
    modelTabSelectTab('BASICS');

    const restoredBasicsTabProps = mockBasicsTab.mock.calls[mockBasicsTab.mock.calls.length - 1][6];
    expect(restoredBasicsTabProps.selectedSubscriptionId).toBe('subscription-1');
  });

  it('handleCreate calls createOrUpdateConnection', async () => {
    renderUseCreateConnectionPanelTabs();

    // Get the onPrimaryButtonClick from modelTab call
    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6]; // 7th argument is the props object

    // Call the onPrimaryButtonClick (handleCreate)
    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(mockCreateOrUpdateConnection).toHaveBeenCalled();
  });

  it('handleCreate calls close after successful connection creation', async () => {
    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6];

    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(mockClose).toHaveBeenCalled();
  });

  it('memoizes tabs array when dependencies do not change', () => {
    const { result, rerender } = renderUseCreateConnectionPanelTabs();

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('sets basicsError and blocks navigation when required values are empty', () => {
    renderUseCreateConnectionPanelTabs();

    // Get the onPrimaryButtonClick from basicsTab call
    const basicsTabCall = mockBasicsTab.mock.calls[0];
    const basicsTabProps = basicsTabCall[6];

    act(() => {
      basicsTabProps.onPrimaryButtonClick();
    });

    const updatedBasicsTabProps = mockBasicsTab.mock.calls[mockBasicsTab.mock.calls.length - 1][6];
    expect(mockSelectTab).not.toHaveBeenCalled();
    expect(updatedBasicsTabProps.tabStatusIcon).toBe('error');
  });

  it('keeps the Basics step disabled when required parameter keys are absent', () => {
    renderUseCreateConnectionPanelTabs();

    act(() => {
      mockBasicsTab.mock.calls[0][4]({ displayName: 'Knowledge Hub', cosmosDBAuthenticationType: 'managedIdentity' });
    });
    const basicsTabProps = mockBasicsTab.mock.calls[mockBasicsTab.mock.calls.length - 1][6];

    expect(basicsTabProps.isPrimaryButtonDisabled).toBe(true);
    basicsTabProps.onPrimaryButtonClick();
    expect(mockSelectTab).not.toHaveBeenCalled();
  });

  it('handles create error gracefully', async () => {
    mockCreateOrUpdateConnection.mockRejectedValueOnce(new Error('Create failed'));

    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6];

    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        content: 'Create failed',
      })
    );
  });

  it('does not call close when create fails', async () => {
    mockCreateOrUpdateConnection.mockRejectedValueOnce(new Error('Create failed'));

    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6];

    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(mockClose).not.toHaveBeenCalled();
  });

  it('passes close function to basicsTab', () => {
    renderUseCreateConnectionPanelTabs();

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    // arg[1] is close function
    expect(basicsTabCall[1]).toBe(mockClose);
  });

  it('passes selectTab function to modelTab', () => {
    renderUseCreateConnectionPanelTabs();

    const modelTabCall = mockModelTab.mock.calls[0];
    // arg[1] is selectTab function
    expect(modelTabCall[1]).toBe(mockSelectTab);
  });
});
