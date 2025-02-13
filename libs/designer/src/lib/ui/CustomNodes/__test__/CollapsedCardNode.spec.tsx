import React from 'react';
import renderer from 'react-test-renderer';
import CollapsedNode from '../CollapsedCardNode';
import { vi, beforeEach, describe, Mock, it, expect } from 'vitest';
import { useCollapsedMapping, useIsActionCollapsed, useShouldNodeFocus } from '../../../core/state/workflow/workflowSelectors';
import { NodeProps } from '@xyflow/react';
import { useOperationsVisuals } from '../../../core/state/operation/operationSelector';
import { render, screen, fireEvent } from '@testing-library/react';

const mockDispatch = vi.fn();

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
