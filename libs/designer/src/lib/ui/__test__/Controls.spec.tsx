import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock values for nodes and edges
let mockNodes: { id: string }[] = [];
let mockEdges: { id: string }[] = [];

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
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

vi.mock('../../core/state/designerView/designerViewSelectors', () => ({
  useShowMinimap: () => false,
}));

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactFlow: () => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }),
    useNodes: () => mockNodes,
    useEdges: () => mockEdges,
    Controls: ({ children }: { children: React.ReactNode }) => <div data-testid="controls">{children}</div>,
    ControlButton: ({
      children,
      tabIndex,
      id,
      ...props
    }: {
      children: React.ReactNode;
      tabIndex?: number;
      id?: string;
      'aria-label'?: string;
    }) => (
      <button data-testid={id} data-tabindex={tabIndex} {...props}>
        {children}
      </button>
    ),
  };
});

vi.mock('../common/controls/collapseExpandControl', () => ({
  default: ({ tabIndex }: { tabIndex?: number }) => (
    <button data-testid="collapse-expand-control" data-tabindex={tabIndex}>
      Collapse/Expand
    </button>
  ),
}));

vi.mock(import('@fluentui/react-icons'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AddRegular: () => <span>+</span>,
    SubtractRegular: () => <span>-</span>,
    MapFilled: () => <span>MapFilled</span>,
    MapRegular: () => <span>MapRegular</span>,
    SearchRegular: () => <span>Search</span>,
    ZoomFitRegular: () => <span>Fit</span>,
  };
});

vi.mock(import('@microsoft/logic-apps-shared'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    LogEntryLevel: { Verbose: 'Verbose' },
    LoggerService: () => ({ log: vi.fn() }),
  };
});

// Import after mocks
import CustomControls from '../Controls';

describe('CustomControls', () => {
  beforeEach(() => {
    mockNodes = [];
    mockEdges = [];
  });

  describe('tabIndex calculation', () => {
    it('should calculate tabIndex as 1 when there are no nodes or edges', () => {
      mockNodes = [];
      mockEdges = [];

      render(<CustomControls />);

      // tabIndex = (0 * 2) + 0 + 1 = 1
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('1');
    });

    it('should calculate tabIndex correctly with nodes only', () => {
      mockNodes = [{ id: 'node1' }, { id: 'node2' }, { id: 'node3' }];
      mockEdges = [];

      render(<CustomControls />);

      // tabIndex = (3 * 2) + 0 + 1 = 7
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('7');
    });

    it('should calculate tabIndex correctly with edges only', () => {
      mockNodes = [];
      mockEdges = [{ id: 'edge1' }, { id: 'edge2' }];

      render(<CustomControls />);

      // tabIndex = (0 * 2) + 2 + 1 = 3
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('3');
    });

    it('should calculate tabIndex correctly with both nodes and edges', () => {
      mockNodes = [{ id: 'node1' }, { id: 'node2' }];
      mockEdges = [{ id: 'edge1' }, { id: 'edge2' }, { id: 'edge3' }];

      render(<CustomControls />);

      // tabIndex = (2 * 2) + 3 + 1 = 8
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('8');
    });

    it('should apply the same tabIndex to all control buttons', () => {
      mockNodes = [{ id: 'node1' }];
      mockEdges = [{ id: 'edge1' }];

      render(<CustomControls />);

      // tabIndex = (1 * 2) + 1 + 1 = 4
      const expectedTabIndex = '4';

      expect(screen.getByTestId('collapse-expand-control').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-in-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-out-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-fit-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-search-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-minimap-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
    });

    it('should handle large workflow with many nodes and edges', () => {
      // Simulate a large workflow
      mockNodes = Array.from({ length: 50 }, (_, i) => ({ id: `node${i}` }));
      mockEdges = Array.from({ length: 75 }, (_, i) => ({ id: `edge${i}` }));

      render(<CustomControls />);

      // tabIndex = (50 * 2) + 75 + 1 = 176
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('176');
    });
  });

  describe('control buttons rendering', () => {
    it('should render all control buttons', () => {
      render(<CustomControls />);

      expect(screen.getByTestId('collapse-expand-control')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-out-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-fit-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-search-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-minimap-button')).toBeInTheDocument();
    });
  });
});
