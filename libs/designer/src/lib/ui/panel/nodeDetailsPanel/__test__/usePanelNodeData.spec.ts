import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all hooks used by usePanelNodeData
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../core', () => ({
  useNodeDisplayName: vi.fn(),
  useNodeMetadata: vi.fn(),
}));

vi.mock('../../../../core/state/operation/operationMetadataSlice', () => ({
  ErrorLevel: { Critical: 'Critical', Connection: 'Connection' },
}));

vi.mock('../../../../core/state/operation/operationSelector', () => ({
  useIconUri: vi.fn(),
  useOperationErrorInfo: vi.fn(),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  setPinnedPanelActiveTab: vi.fn((tabId: string) => ({ type: 'setPinnedPanelActiveTab', payload: tabId })),
  setSelectedPanelActiveTab: vi.fn((tabId: string) => ({ type: 'setSelectedPanelActiveTab', payload: tabId })),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsNodePinnedToOperationPanel: vi.fn(),
  useOperationPanelAlternateNodeActiveTabId: vi.fn(),
  useOperationPanelSelectedNodeActiveTabId: vi.fn(),
}));

vi.mock('../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationQuery: vi.fn(),
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useNodeDescription: vi.fn(),
  useRunData: vi.fn(),
}));

vi.mock('../usePanelTabs', () => ({
  usePanelTabs: vi.fn(),
}));

import { usePanelNodeData } from '../usePanelNodeData';
import { useNodeDisplayName, useNodeMetadata } from '../../../../core';
import { useIconUri, useOperationErrorInfo } from '../../../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel } from '../../../../core/state/panel/panelSelectors';
import { useOperationQuery } from '../../../../core/state/selectors/actionMetadataSelector';
import { useRunData } from '../../../../core/state/workflow/workflowSelectors';
import { usePanelTabs } from '../usePanelTabs';
import { renderHook } from '@testing-library/react';

describe('usePanelNodeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNodeDisplayName as any).mockReturnValue('Test Node');
    (useNodeMetadata as any).mockReturnValue({ subgraphType: undefined });
    (useIconUri as any).mockReturnValue('https://example.com/icon.png');
    (useOperationErrorInfo as any).mockReturnValue(undefined);
    (useIsNodePinnedToOperationPanel as any).mockReturnValue(false);
    (useOperationQuery as any).mockReturnValue({ isLoading: false, isError: false, data: {} });
    (useRunData as any).mockReturnValue(undefined);
    (usePanelTabs as any).mockReturnValue([]);
  });

  it('should return undefined when nodeId is undefined', () => {
    const { result } = renderHook(() => usePanelNodeData(undefined));
    expect(result.current).toBeUndefined();
  });

  it('should return panel data for a regular node', () => {
    const { result } = renderHook(() => usePanelNodeData('test-node'));
    expect(result.current).toBeDefined();
    expect(result.current?.nodeId).toBe('test-node');
    expect(result.current?.displayName).toBe('Test Node');
    expect(result.current?.iconUri).toBe('https://example.com/icon.png');
    expect(result.current?.isLoading).toBe(false);
  });

  it('should provide default icon for built-in agent tool (code_interpreter)', () => {
    (useIconUri as any).mockReturnValue(''); // No icon from operationInfo

    const { result } = renderHook(() => usePanelNodeData('code_interpreter'));
    expect(result.current).toBeDefined();
    expect(result.current?.iconUri).toContain('data:image/svg+xml');
  });

  it('should not show loading state when built-in tool has runData but no operationInfo', () => {
    (useIconUri as any).mockReturnValue('');
    (useRunData as any).mockReturnValue({ status: 'Succeeded' });
    (useOperationQuery as any).mockReturnValue({ isLoading: true, isError: false, data: undefined });

    const { result } = renderHook(() => usePanelNodeData('code_interpreter'));
    expect(result.current).toBeDefined();
    // hasRunDataOnly = true (runData exists, opQuery.data is undefined)
    // So isLoading should be false despite opQuery.isLoading being true
    expect(result.current?.isLoading).toBe(false);
  });

  it('should show loading for a regular node with opQuery.isLoading', () => {
    (useOperationQuery as any).mockReturnValue({ isLoading: true, isError: false, data: undefined });
    (useRunData as any).mockReturnValue(undefined);

    const { result } = renderHook(() => usePanelNodeData('regular-node'));
    expect(result.current).toBeDefined();
    // No runData, so hasRunDataOnly = false, isLoading should be true
    expect(result.current?.isLoading).toBe(true);
  });

  it('should not show loading when there is an error', () => {
    (useOperationQuery as any).mockReturnValue({ isLoading: true, isError: true, data: undefined });

    const { result } = renderHook(() => usePanelNodeData('error-node'));
    expect(result.current).toBeDefined();
    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.isError).toBe(true);
  });

  it('should not override icon for regular nodes without icon', () => {
    (useIconUri as any).mockReturnValue('');

    const { result } = renderHook(() => usePanelNodeData('regular-node'));
    expect(result.current).toBeDefined();
    // Regular nodes without icon get empty string, NOT the built-in tool icon
    expect(result.current?.iconUri).toBe('');
  });

  it('should include runData when available', () => {
    const mockRunData = { status: 'Succeeded', startTime: '2024-01-01T00:00:00Z' };
    (useRunData as any).mockReturnValue(mockRunData);

    const { result } = renderHook(() => usePanelNodeData('test-node'));
    expect(result.current?.runData).toEqual(mockRunData);
  });
});
