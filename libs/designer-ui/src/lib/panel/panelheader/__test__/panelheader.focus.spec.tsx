import { cleanup, render, screen } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelLocation, PanelScope } from '../../panelUtil';
import { PanelHeader, type PanelHeaderProps } from '../panelheader';

const nodeIds = ['Http', 'Switch', 'Condition'];

const headerProps = (nodeId: string): PanelHeaderProps => ({
  nodeData: {
    nodeId,
    displayName: nodeId,
    comment: undefined,
    errorMessage: undefined,
    iconUri: '',
    isError: false,
    isLoading: false,
    onSelectTab: vi.fn(),
    runData: undefined,
    selectedTab: undefined,
    subgraphType: undefined,
    tabs: [],
  },
  headerItems: [],
  headerLocation: PanelLocation.Right,
  panelScope: PanelScope.CardLevel,
  onClose: vi.fn(),
  onTitleChange: vi.fn(),
  commentChange: vi.fn(),
  handleTitleUpdate: vi.fn(),
});

const CanvasCard = ({ nodeId, focusedNodeId }: { nodeId: string; focusedNodeId?: string }) => {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusedNodeId === nodeId) {
      ref.current?.focus();
    }
  }, [focusedNodeId, nodeId]);

  return (
    <button ref={ref} id={`msla-node-${nodeId}`} type="button">
      Canvas {nodeId}
    </button>
  );
};

interface FixtureProps {
  enableNodeNavigation?: boolean;
  selectedNodeId: string;
  focusedNodeId?: string;
  panelFirst: boolean;
  suppressDefaultNodeSelectFunctionality?: boolean;
}

const Fixture = ({
  selectedNodeId,
  focusedNodeId,
  panelFirst,
  suppressDefaultNodeSelectFunctionality,
  enableNodeNavigation = true,
}: FixtureProps) => {
  const panel = (
    <PanelHeader
      {...headerProps(selectedNodeId)}
      enableNodeNavigation={enableNodeNavigation}
      suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
    />
  );
  const canvas = (
    <div>
      {nodeIds.map((nodeId) => (
        <CanvasCard key={nodeId} nodeId={nodeId} focusedNodeId={focusedNodeId} />
      ))}
    </div>
  );
  return (
    <IntlProvider locale="en">
      {panelFirst ? panel : canvas}
      {panelFirst ? canvas : panel}
    </IntlProvider>
  );
};

describe.each([
  { name: 'canvas before panel', panelFirst: false },
  { name: 'panel before canvas', panelFirst: true },
])('PanelHeader focus ordering: $name', ({ panelFirst }) => {
  let focusOrder: string[];
  const recordFocus = (event: FocusEvent) => {
    if (event.target instanceof HTMLElement) {
      focusOrder.push(event.target.id);
    }
  };

  beforeEach(() => {
    focusOrder = [];
    document.addEventListener('focusin', recordFocus);
  });

  afterEach(() => {
    document.removeEventListener('focusin', recordFocus);
    cleanup();
  });

  it('keeps default Close autofocus on mount and ordinary selection changes without a canvas request', () => {
    const { rerender } = render(<Fixture selectedNodeId="Http" panelFirst={panelFirst} />);
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();

    screen.getByRole('button', { name: 'Canvas Http' }).focus();
    rerender(<Fixture selectedNodeId="Switch" panelFirst={panelFirst} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBe(close);
    expect(close).toHaveFocus();
  });

  it('preserves passive panel focus ordering without the v2 opt-in', () => {
    render(<Fixture selectedNodeId="Switch" focusedNodeId="Switch" panelFirst={panelFirst} enableNodeNavigation={false} />);
    expect(focusOrder).toEqual(
      panelFirst ? ['msla-panel-header-close-nav', 'msla-node-Switch'] : ['msla-node-Switch', 'msla-panel-header-close-nav']
    );
  });

  it('lets an explicit canvas passive effect win after default panel focus on initial mount', () => {
    render(<Fixture selectedNodeId="Switch" focusedNodeId="Switch" panelFirst={panelFirst} />);
    expect(focusOrder).toEqual(['msla-panel-header-close-nav', 'msla-node-Switch']);
    expect(screen.getByRole('button', { name: 'Canvas Switch' })).toHaveFocus();
  });

  it('keeps explicit canvas focus through repeated selections without remounting the header or cards', () => {
    const { rerender } = render(<Fixture selectedNodeId="Http" focusedNodeId="Http" panelFirst={panelFirst} />);
    const close = screen.getByRole('button', { name: 'Close' });
    const originalHttpCard = screen.getByRole('button', { name: 'Canvas Http' });
    expect(originalHttpCard).toHaveFocus();

    for (const nodeId of ['Switch', 'Condition', 'Http']) {
      focusOrder.length = 0;
      rerender(<Fixture selectedNodeId={nodeId} focusedNodeId={nodeId} panelFirst={panelFirst} />);
      expect(focusOrder).toEqual(['msla-panel-header-close-nav', `msla-node-${nodeId}`]);
      expect(screen.getByRole('button', { name: `Canvas ${nodeId}` })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Close' })).toBe(close);
      expect(screen.getByRole('button', { name: 'Canvas Http' })).toBe(originalHttpCard);
    }
  });

  it('does not steal focus when the one-shot request clears or the same node rerenders', () => {
    const { rerender } = render(<Fixture selectedNodeId="Switch" focusedNodeId="Switch" panelFirst={panelFirst} />);
    focusOrder.length = 0;
    rerender(<Fixture selectedNodeId="Switch" panelFirst={panelFirst} />);
    rerender(<Fixture selectedNodeId="Switch" panelFirst={panelFirst} />);
    expect(screen.getByRole('button', { name: 'Canvas Switch' })).toHaveFocus();
    expect(focusOrder).toEqual([]);
  });

  it('returns to normal panel autofocus when a later selection has no canvas request', () => {
    const { rerender } = render(<Fixture selectedNodeId="Switch" focusedNodeId="Switch" panelFirst={panelFirst} />);
    expect(screen.getByRole('button', { name: 'Canvas Switch' })).toHaveFocus();
    focusOrder.length = 0;
    rerender(<Fixture selectedNodeId="Condition" panelFirst={panelFirst} />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(focusOrder).toEqual(['msla-panel-header-close-nav']);
  });

  it('does not introduce panel focus when the host suppresses the Close button', () => {
    render(<Fixture selectedNodeId="Switch" focusedNodeId="Switch" panelFirst={panelFirst} suppressDefaultNodeSelectFunctionality />);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas Switch' })).toHaveFocus();
    expect(focusOrder).toEqual(['msla-node-Switch']);
  });
});
