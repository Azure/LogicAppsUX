/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
const mockSelectPanelTab = vi.fn((tab: string) => ({ type: 'mcpPanel/selectPanelTab', payload: tab }));
vi.mock('../../../../../core/state/mcp/panel/mcpPanelSlice', () => ({
  selectPanelTab: (tab: string) => mockSelectPanelTab(tab),
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

  it('returns an array of tabs', () => {
    const { result } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current).toHaveLength(2);
  });

  it('calls basicsTab with correct parameters', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(mockBasicsTab).toHaveBeenCalledTimes(1);
    expect(mockBasicsTab).toHaveBeenCalledWith(
      expect.any(Object), // intl
      expect.any(Function), // dispatch
      expect.objectContaining({
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: expect.any(Function),
      })
    );
  });

  it('calls modelTab with correct parameters', () => {
    renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    expect(mockModelTab).toHaveBeenCalledTimes(1);
    expect(mockModelTab).toHaveBeenCalledWith(
      expect.any(Object), // intl
      expect.any(Function), // dispatch
      expect.objectContaining({
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: expect.any(Function),
      })
    );
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
    const basicsTabProps = basicsTabCall[2];

    // Call the onPrimaryButtonClick (handleMoveToModel)
    basicsTabProps.onPrimaryButtonClick();

    expect(mockSelectPanelTab).toHaveBeenCalledWith('MODEL');
  });

  it('memoizes tabs array when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useCreateConnectionPanelTabs(), { wrapper });

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});
