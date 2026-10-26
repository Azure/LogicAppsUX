// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDispatch = vi.fn();
const mockToggleCollapse = vi.fn();
let mockSelectedNodeIds = ['first', 'second'];
let mockCanWrap = true;

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: (descriptor: { defaultMessage: string }, values?: { count?: number }) =>
      descriptor.defaultMessage.replace('{count}', String(values?.count ?? '')),
  }),
}));

vi.mock('@fluentui/react-components', () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
    <button ref={ref} type="button" {...props} />
  )),
  Menu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  MenuButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
  MenuItem: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
  MenuList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  MenuPopover: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  MenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tag: ({
    children,
    media,
    value,
    onDismiss,
  }: React.PropsWithChildren<{
    media?: React.ReactNode;
    value: string;
    onDismiss?: (event: unknown, data: { value: string }) => void;
  }>) => (
    <div>
      {media}
      <span>{children}</span>
      <button type="button" aria-label={`Remove ${value}`} onClick={(event) => onDismiss?.(event, { value })}>
        Remove
      </button>
    </div>
  ),
  TagGroup: ({ children, onDismiss }: React.PropsWithChildren<{ onDismiss: (event: unknown, data: { value: string }) => void }>) => (
    <div data-testid="tag-group">
      {children}
      <button type="button" aria-label="Dismiss first action" onClick={(event) => onDismiss(event, { value: 'first' })}>
        Dismiss first
      </button>
    </div>
  ),
  Tooltip: ({ children, content }: React.PropsWithChildren<{ content: string }>) => (
    <div>
      <span>{content}</span>
      {children}
    </div>
  ),
}));

vi.mock('@microsoft/designer-ui', () => ({
  PanelContainer: ({
    customAriaLabel,
    customContent,
    onClose,
  }: {
    customAriaLabel: string;
    customContent: React.ReactNode;
    onClose: () => void;
  }) => (
    <section aria-label={customAriaLabel}>
      {customContent}
      <button type="button" onClick={onClose}>
        Close container
      </button>
    </section>
  ),
  PanelHeader: ({
    customIcon,
    nodeData,
    onClose,
  }: {
    customIcon: React.ReactNode;
    nodeData: { displayName: string };
    onClose: () => void;
  }) => (
    <header>
      <h2>{nodeData.displayName}</h2>
      {customIcon}
      <button type="button" onClick={onClose}>
        Close header
      </button>
    </header>
  ),
  PanelLocation: { Right: 'Right', Left: 'Left' },
  PanelScope: { CardLevel: 'CardLevel' },
  PanelSize: { DualView: 'DualView' },
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useNodeDisplayName: (nodeId: string) => `Display ${nodeId}`,
}));

vi.mock('../../../../core/state/operation/operationSelector', () => ({
  useOperationVisuals: (nodeId: string) => ({ iconUri: nodeId === 'first' ? 'first.svg' : undefined }),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useCanWrapSelectedNodes: () => mockCanWrap,
  useOperationPanelSelectedNodeIds: () => mockSelectedNodeIds,
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  clearPanel: vi.fn(() => ({ type: 'clearPanel' })),
  setNodeSelection: vi.fn((payload: string[]) => ({ type: 'setNodeSelection', payload })),
}));

vi.mock('../../../../core/state/designerView/designerViewSlice', () => ({
  setShowMultiSelectDeleteModal: vi.fn((payload: boolean) => ({ type: 'setShowMultiSelectDeleteModal', payload })),
}));

vi.mock('../../../../core/actions/bjsworkflow/wrapInScope', () => ({
  wrapSelectedNodesInScope: vi.fn((payload: unknown) => ({ type: 'wrapSelectedNodesInScope', payload })),
}));

vi.mock('../../../../core/actions/bjsworkflow/copypaste', () => ({
  copyOperations: vi.fn((payload: unknown) => ({ type: 'copyOperations', payload })),
  cutOperations: vi.fn((payload: unknown) => ({ type: 'cutOperations', payload })),
}));

vi.mock('../../../common/DesignerContextualMenu/CopyTooltip', () => ({
  CopyTooltip: ({ hideTooltip }: { hideTooltip: () => void }) => (
    <div data-testid="copy-tooltip">
      Copied
      <button type="button" onClick={hideTooltip}>
        Hide copied tooltip
      </button>
    </div>
  ),
}));

vi.mock('../multiSelectPanel.styles', () => ({
  useMultiSelectPanelStyles: () => ({
    actionButtons: 'action-buttons',
    countBadge: 'count-badge',
    menuItemIcon: 'menu-item-icon',
    root: 'root',
    tagIcon: 'tag-icon',
    tagList: 'tag-list',
  }),
}));

vi.mock('../workflowExtraction', () => ({
  WorkflowExtractionAction: () => <button type="button">Extract workflow</button>,
}));

import { copyOperations, cutOperations } from '../../../../core/actions/bjsworkflow/copypaste';
import { wrapSelectedNodesInScope } from '../../../../core/actions/bjsworkflow/wrapInScope';
import { setShowMultiSelectDeleteModal } from '../../../../core/state/designerView/designerViewSlice';
import { clearPanel, setNodeSelection } from '../../../../core/state/panel/panelSlice';
import { MultiSelectPanel } from '../multiSelectPanel';

const renderPanel = (panelLocation?: 'Left' | 'Right') =>
  render(
    <MultiSelectPanel
      {...({
        panelLocation,
        toggleCollapse: mockToggleCollapse,
      } as any)}
    />
  );

describe('MultiSelectPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedNodeIds = ['first', 'second'];
    mockCanWrap = true;
  });

  afterEach(cleanup);

  it('renders selected actions, count, visuals, extraction action, and the requested panel side', () => {
    const { container } = renderPanel('Left');

    expect(screen.getByRole('region', { name: 'Multi-select panel' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Multiple actions selected' })).toBeDefined();
    expect(screen.getByLabelText('2 actions selected').textContent).toBe('2');
    expect(screen.getByText('Display first')).toBeDefined();
    expect(screen.getByText('Display second')).toBeDefined();
    expect(container.querySelector('img[src="first.svg"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Extract workflow' })).toBeDefined();
    expect(container.querySelector('.msla-panel-container-nested-left')).not.toBeNull();
    expect(container.querySelector('[data-automation-id="multi-select-action-buttons"]')).not.toBeNull();
  });

  it('copies, cuts, and deletes the selected actions with user-visible feedback', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(copyOperations).toHaveBeenCalledWith({ nodeIds: ['first', 'second'] });
    expect(screen.getByTestId('copy-tooltip')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Hide copied tooltip' }));
    expect(screen.queryByTestId('copy-tooltip')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cut' }));
    expect(cutOperations).toHaveBeenCalledWith({ nodeIds: ['first', 'second'] });
    expect(screen.getByTestId('copy-tooltip')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(setShowMultiSelectDeleteModal).toHaveBeenCalledWith(true);
  });

  it('removes only the dismissed action from the current selection', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss first action' }));

    expect(setNodeSelection).toHaveBeenCalledWith(['second']);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setNodeSelection', payload: ['second'] });
  });

  it('dispatches each supported grouping operation for a contiguous selection', () => {
    renderPanel();

    const actionButtons = screen.getByTestId('tag-group').parentElement as HTMLElement;
    for (const [label, scopeType] of [
      ['Scope', 'Scope'],
      ['Condition', 'If'],
      ['For each', 'ForEach'],
      ['Do until', 'Until'],
      ['Switch', 'Switch'],
    ]) {
      fireEvent.click(within(actionButtons).getByRole('button', { name: label }));
      expect(wrapSelectedNodesInScope).toHaveBeenCalledWith({ nodeIds: ['first', 'second'], scopeType });
    }
  });

  it('disables grouping and explains why when the selection cannot be wrapped', () => {
    mockCanWrap = false;
    renderPanel();

    expect(screen.getByRole('button', { name: 'Group' })).toBeDisabled();
    expect(screen.getByText('Select actions that form a contiguous block to group them')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Scope' })).toBeNull();
  });

  it('clears selection and panel state before collapsing on close', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Close container' }));

    expect(setNodeSelection).toHaveBeenCalledWith([]);
    expect(clearPanel).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenNthCalledWith(1, { type: 'setNodeSelection', payload: [] });
    expect(mockDispatch).toHaveBeenNthCalledWith(2, { type: 'clearPanel' });
    expect(mockToggleCollapse).toHaveBeenCalledTimes(1);
  });
});
