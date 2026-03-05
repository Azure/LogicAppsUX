import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock state values
let mockIsExpanded = true;
let mockNodes: { id: string }[] = [];
const mockDispatch = vi.fn();
const mockLogService = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock(import('react-intl'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    }),
  };
});

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useIsEverythingExpanded: () => mockIsExpanded,
}));

vi.mock('../../../../core/graphlayout', () => ({
  useLayout: () => [mockNodes],
}));

vi.mock('../../../../core/state/workflow/workflowSlice', () => ({
  setCollapsedGraphIds: (ids: string[]) => ({ type: 'workflow/setCollapsedGraphIds', payload: ids }),
}));

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ControlButton: ({
      children,
      tabIndex,
      id,
      onClick,
      ...props
    }: {
      children: React.ReactNode;
      tabIndex?: number;
      id?: string;
      onClick?: () => void;
      'aria-label'?: string;
      title?: string;
    }) => (
      <button data-testid={id} data-tabindex={tabIndex} onClick={onClick} {...props}>
        {children}
      </button>
    ),
  };
});

vi.mock(import('@fluentui/react-icons'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ArrowMaximizeVerticalRegular: () => <span data-testid="expand-icon">Expand</span>,
    ArrowMinimizeVerticalRegular: () => <span data-testid="collapse-icon">Collapse</span>,
  };
});

vi.mock(import('@microsoft/logic-apps-shared'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    LogEntryLevel: { Verbose: 'Verbose' },
    LoggerService: () => ({ log: mockLogService }),
  };
});

// Import after mocks
import CollapseExpandControl, { expandCollapseControlId } from '../collapseExpandControl';

describe('CollapseExpandControl', () => {
  beforeEach(() => {
    mockIsExpanded = true;
    mockNodes = [];
    mockDispatch.mockClear();
    mockLogService.mockClear();
  });

  describe('rendering', () => {
    it('should render the control button with correct id', () => {
      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      expect(button).toBeInTheDocument();
    });

    it('should show collapse icon and label when expanded', () => {
      mockIsExpanded = true;

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      expect(button).toHaveAttribute('aria-label', 'Collapse all');
      expect(button).toHaveAttribute('title', 'Collapse all');
      expect(screen.getByTestId('collapse-icon')).toBeInTheDocument();
    });

    it('should show expand icon and label when collapsed', () => {
      mockIsExpanded = false;

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      expect(button).toHaveAttribute('aria-label', 'Expand all');
      expect(button).toHaveAttribute('title', 'Expand all');
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument();
    });

    it('should pass tabIndex prop to button', () => {
      render(<CollapseExpandControl tabIndex={5} />);

      const button = screen.getByTestId(expandCollapseControlId);
      expect(button.getAttribute('data-tabindex')).toBe('5');
    });

    it('should not set tabIndex when prop is not provided', () => {
      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      expect(button.getAttribute('data-tabindex')).toBeNull();
    });
  });

  describe('click behavior', () => {
    it('should dispatch setCollapsedGraphIds with node ids when collapsing', () => {
      mockIsExpanded = true;
      mockNodes = [{ id: 'node1' }, { id: 'node2' }, { id: 'node3' }];

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      fireEvent.click(button);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'workflow/setCollapsedGraphIds',
        payload: ['node1', 'node2', 'node3'],
      });
    });

    it('should dispatch setCollapsedGraphIds with empty array when expanding', () => {
      mockIsExpanded = false;
      mockNodes = [{ id: 'node1' }, { id: 'node2' }];

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      fireEvent.click(button);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'workflow/setCollapsedGraphIds',
        payload: [],
      });
    });

    it('should dispatch with empty array if nodes is undefined when collapsing', () => {
      mockIsExpanded = true;
      mockNodes = undefined as unknown as { id: string }[];

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      fireEvent.click(button);

      // When nodes is falsy, falls through to else branch
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'workflow/setCollapsedGraphIds',
        payload: [],
      });
    });

    it('should log when button is clicked', () => {
      mockIsExpanded = true;
      mockNodes = [{ id: 'node1' }];

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      fireEvent.click(button);

      expect(mockLogService).toHaveBeenCalledTimes(1);
      expect(mockLogService).toHaveBeenCalledWith({
        area: 'CustomControls:expandCollapseToggleClick',
        level: 'Verbose',
        message: 'Expand all/Collapse all button clicked.',
        args: ['true'],
      });
    });

    it('should log expanded state as false when collapsed', () => {
      mockIsExpanded = false;

      render(<CollapseExpandControl />);

      const button = screen.getByTestId(expandCollapseControlId);
      fireEvent.click(button);

      expect(mockLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['false'],
        })
      );
    });
  });

  describe('exported constants', () => {
    it('should export the correct control id', () => {
      expect(expandCollapseControlId).toBe('control-expand-collapse-button');
    });
  });
});
