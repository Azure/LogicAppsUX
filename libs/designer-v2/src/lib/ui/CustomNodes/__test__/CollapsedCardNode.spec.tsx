import React from 'react';
import renderer from 'react-test-renderer';
import CollapsedNode from '../CollapsedCardNode';
import { vi, beforeEach, describe, Mock, it, expect } from 'vitest';
import { useCollapsedMapping, useIsActionCollapsed, useShouldNodeFocus } from '../../../core/state/workflow/workflowSelectors';
import { NodeProps } from '@xyflow/react';
import { useOperationsVisuals } from '../../../core/state/operation/operationSelector';
import { render, screen, fireEvent } from '@testing-library/react';

const mockDispatch = vi.fn();
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => false,
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}));

vi.mock('../../../core/state/operation/operationSelector', () => ({
  useOperationsVisuals: vi.fn(),
}));

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useCollapsedMapping: vi.fn(),
  useIsActionCollapsed: vi.fn(),
  useShouldNodeFocus: vi.fn(),
  useNodeDisplayName: () => 'Node one',
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useNodeIndex: () => 1,
}));

vi.mock(import('../../connections/dropzone'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DropZone: (({ children, ...props }) => <div {...props}>{'DropZone'}</div>) as any,
  };
});

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNodeId: () => null,
    useNodesData: () => undefined,
    Handle: (({ children, ...props }) => <div {...props}>{'Handle reactflow'}</div>) as any,
  };
});

vi.mock(import('@microsoft/designer-ui'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // your mocked methods
    CollapsedCard: ({ onContextMenu, id, actionCount, operationVisuals, isExpanding }) => {
      return (
        <div data-testid="collapsed-card" onContextMenu={onContextMenu}>
          {id}-{actionCount}-{JSON.stringify(operationVisuals)}-{isExpanding ? 'expanding' : 'not expanding'}
        </div>
      );
    },
  };
});

describe('CollapsedNode', () => {
  const defaultProps = {
    id: 'node-1',
  } as NodeProps;

  beforeEach(() => {
    (useOperationsVisuals as Mock).mockReturnValue(['visual1', 'visual2', 'visual3']);
    (useCollapsedMapping as Mock).mockReturnValue({
      'node-1': ['node-1', 'node-a', 'node-b', 'node-c'],
    });
    (useIsActionCollapsed as Mock).mockReturnValue(false);
  });

  it('should render without crashing', () => {
    const collapsedCardNode = renderer.create(<CollapsedNode {...defaultProps} />).toJSON();
    expect(collapsedCardNode).toMatchSnapshot();
  });

  it('uses the real collapsed identity count and preserves focus, context and expand commands', () => {
    (useIsActionCollapsed as Mock).mockReturnValue(true);
    (useOperationsVisuals as Mock).mockReturnValue([
      { id: 'node-1', iconUri: '/scope.svg' },
      { id: 'node-a', iconUri: '/compose.svg' },
      { id: 'node-b', iconUri: '' },
      { id: 'node-c', iconUri: '/mail.svg' },
    ]);
    (useCollapsedMapping as Mock).mockReturnValue({ 'node-1': ['node-1', 'node-a', 'node-b', 'node-c', 'node-1-#footer'] });
    (useShouldNodeFocus as Mock).mockReturnValue(true);
    mockDispatch.mockClear();
    render(<CollapsedNode {...defaultProps} data={{ presentation: { shared: true, family: 'collapsed' } }} />);
    const chip = screen.getByRole('button', { name: 'Node one: show 4 actions' });
    expect(screen.getByText('Node one')).toBeVisible();
    expect(screen.getByText('4 actions')).toBeVisible();
    expect(chip.querySelectorAll('[data-summary-thumbnail]')).toHaveLength(3);
    const count = screen.getByText('4 actions');
    const thumbnails = chip.querySelector('[data-summary-thumbnail]')!.parentElement!;
    expect(count.nextElementSibling).toBe(thumbnails);
    expect(getComputedStyle(count.parentElement!).flexDirection).toBe('column');
    expect(chip.querySelector('img[src="/scope.svg"]')).toBeInTheDocument();
    expect(chip.querySelector('img[src="/compose.svg"]')).toBeInTheDocument();
    expect(chip.parentElement?.style.height).toBe('68px');
    expect(useOperationsVisuals).toHaveBeenLastCalledWith(['node-1', 'node-a', 'node-b', 'node-c']);
    expect(chip.getAttribute('data-automation-id')).toBe('msla-collapsed-card-node_1');
    expect(chip.id).toBe('msla-collapsed-card-node_1');
    expect(document.activeElement).toBe(chip);
    fireEvent.click(chip);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'workflow/expandCollapsedAction', payload: 'node-1' });
    fireEvent.contextMenu(chip, { clientX: 12, clientY: 34 });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'designerView/setNodeContextMenuData',
      payload: { nodeId: 'node-1', location: { x: 12, y: 34 } },
    });
  });

  it('should call dispatch on context menu event', () => {
    const collapsedCardNode = render(<CollapsedNode {...defaultProps} />);

    const collapsedCard = screen.getByTestId('collapsed-card');

    // Fire a contextmenu event with specific coordinates.
    fireEvent.contextMenu(collapsedCard, {
      clientX: 100,
      clientY: 150,
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      payload: {
        nodeId: 'node-1',
        location: {
          x: 100,
          y: 150,
        },
      },
      type: 'designerView/setNodeContextMenuData',
    });

    expect(collapsedCardNode).toMatchSnapshot();
  });
});
