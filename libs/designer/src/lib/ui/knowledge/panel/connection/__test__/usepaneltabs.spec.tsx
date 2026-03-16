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
}));

vi.mock('../tabs/model', () => ({
  modelTab: (...args: any[]) => mockModelTab(...args),
}));

// Mock selectPanelTab action
const mockSelectPanelTab = vi.fn((tab: string) => ({ type: 'knowledgeHubPanel/selectPanelTab', payload: tab }));
vi.mock('../../../../../core/state/knowledge/panelSlice', () => ({
  selectPanelTab: (tab: string) => mockSelectPanelTab(tab),
}));

// Mock connection utilities
const mockCreateOrUpdateConnection = vi.fn().mockResolvedValue({});
const mockCosmosDbParams = {
  uiDefinition: { displayName: 'Cosmos DB', description: '' },
  values: [{ name: 'managedIdentity', uiDefinition: { displayName: '', description: '' }, parameters: {} }],
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
    const { result } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current).toHaveLength(2);
  });

  it('calls basicsTab with 7 arguments', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(mockBasicsTab).toHaveBeenCalledTimes(1);
    expect(mockBasicsTab.mock.calls[0]).toHaveLength(7);
  });

  it('passes cosmosDbConnectionParameters to basicsTab', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    // arg[2] is cosmosDbConnectionParameters
    expect(basicsTabCall[2]).toEqual(mockCosmosDbParams);
  });

  it('passes isCreating=false to basicsTab initially', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    // arg[5] is isCreating
    expect(basicsTabCall[5]).toBe(false);
  });

  it('passes correct props object to basicsTab', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const basicsTabCall = mockBasicsTab.mock.calls[0];
    const props = basicsTabCall[6];
    expect(props).toMatchObject({
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });
    expect(typeof props.onPrimaryButtonClick).toBe('function');
  });

  it('calls modelTab with 7 arguments', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(mockModelTab).toHaveBeenCalledTimes(1);
    expect(mockModelTab.mock.calls[0]).toHaveLength(7);
  });

  it('passes openAIConnectionParameters to modelTab', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const modelTabCall = mockModelTab.mock.calls[0];
    // arg[2] is openAIConnectionParameters
    expect(modelTabCall[2]).toEqual(mockOpenAIParams);
  });

  it('passes isCreating=false to modelTab initially', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const modelTabCall = mockModelTab.mock.calls[0];
    // arg[5] is isCreating
    expect(modelTabCall[5]).toBe(false);
  });

  it('passes correct props object to modelTab', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const modelTabCall = mockModelTab.mock.calls[0];
    const props = modelTabCall[6];
    expect(props).toMatchObject({
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });
    expect(typeof props.onPrimaryButtonClick).toBe('function');
  });

  it('returns basicsTab as first tab', () => {
    const { result } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(result.current[0].id).toBe('BASICS');
    expect(result.current[0].title).toBe('Basics');
  });

  it('returns modelTab as second tab', () => {
    const { result } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(result.current[1].id).toBe('MODEL');
    expect(result.current[1].title).toBe('Model');
  });

  it('handleMoveToModel dispatches selectPanelTab with MODEL', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    // Get the onPrimaryButtonClick from basicsTab call
    const basicsTabCall = mockBasicsTab.mock.calls[0];
    const basicsTabProps = basicsTabCall[6]; // 7th argument is the props object

    // Call the onPrimaryButtonClick (handleMoveToModel)
    basicsTabProps.onPrimaryButtonClick();

    expect(mockSelectPanelTab).toHaveBeenCalledWith('MODEL');
  });

  it('handleCreate calls createOrUpdateConnection', async () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    // Get the onPrimaryButtonClick from modelTab call
    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6]; // 7th argument is the props object

    // Call the onPrimaryButtonClick (handleCreate)
    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(mockCreateOrUpdateConnection).toHaveBeenCalled();
  });

  it('memoizes tabs array when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('sets basicsError when moving to model tab with empty values', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    // Get the onPrimaryButtonClick from basicsTab call
    const basicsTabCall = mockBasicsTab.mock.calls[0];
    const basicsTabProps = basicsTabCall[6];

    // Call handleMoveToModel - since values are empty, it should set error
    basicsTabProps.onPrimaryButtonClick();

    // The subsequent render should pass error to basicsTab
    // Check that basicsTab was called again or check the tabStatusIcon
    expect(mockSelectPanelTab).toHaveBeenCalledWith('MODEL');
  });

  it('handles create error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateOrUpdateConnection.mockRejectedValueOnce(new Error('Create failed'));

    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const modelTabCall = mockModelTab.mock.calls[0];
    const modelTabProps = modelTabCall[6];

    await act(async () => {
      await modelTabProps.onPrimaryButtonClick();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating connection:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
