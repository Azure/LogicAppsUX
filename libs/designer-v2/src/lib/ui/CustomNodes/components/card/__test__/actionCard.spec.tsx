// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ActionCard } from '../actionCard';
import type { ActionCardProps } from '../actionCard';

vi.mock('../cardRunStatusBadge', () => ({
  CardRunStatusBadge: ({ status }: { status: string }) => <div data-testid="run-status-badge">{status}</div>,
}));

vi.mock('../cardErrorBadge', () => ({
  CardErrorBadge: ({ messages }: { messages: string[] }) => <div data-testid="error-badge">{messages.join(',')}</div>,
}));

vi.mock('../collapseToggle', () => ({
  CollapseToggle: ({ collapsed, handleCollapse }: { collapsed: boolean; handleCollapse: () => void }) => (
    <button data-testid="collapse-toggle" onClick={handleCollapse}>
      {collapsed ? 'Expand' : 'Collapse'}
    </button>
  ),
}));

const mockDrag = vi.fn();

const defaultProps: ActionCardProps = {
  id: 'test-node',
  title: 'Test Action',
  drag: mockDrag as unknown as ActionCardProps['drag'],
  dragPreview: vi.fn() as unknown as ActionCardProps['dragPreview'],
};

describe('ActionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with title', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('should render with correct test id', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.getByTestId('card-Test Action')).toBeInTheDocument();
  });

  it('should render with correct automation id replacing whitespace', () => {
    render(<ActionCard {...defaultProps} title="My Test Action" />);
    expect(screen.getByTestId('card-My Test Action')).toHaveAttribute('data-automation-id', 'card-my_test_action');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('card-Test Action'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should stop propagation on click', () => {
    const onClick = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ActionCard {...defaultProps} onClick={onClick} />
      </div>
    );
    fireEvent.click(screen.getByTestId('card-Test Action'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('should call onContextMenu when right-clicked', () => {
    const onContextMenu = vi.fn();
    render(<ActionCard {...defaultProps} onContextMenu={onContextMenu} />);
    fireEvent.contextMenu(screen.getByTestId('card-Test Action'));
    expect(onContextMenu).toHaveBeenCalledOnce();
  });

  it('should set tabIndex from nodeIndex', () => {
    render(<ActionCard {...defaultProps} nodeIndex={3} />);
    expect(screen.getByTestId('card-Test Action')).toHaveAttribute('tabindex', '3');
  });

  it('should render icon image when icon is provided', () => {
    const { container } = render(<ActionCard {...defaultProps} icon="https://example.com/icon.svg" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.svg');
  });

  it('should render spinner when isLoading is true', () => {
    render(<ActionCard {...defaultProps} isLoading={true} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should render spinner when no icon is provided', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should render extra spinner when isLoadingDynamicData is true', () => {
    const { container } = render(<ActionCard {...defaultProps} icon="https://example.com/icon.svg" isLoadingDynamicData={true} />);
    expect(container.querySelector('img')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('should set brand color as CSS variable', () => {
    render(<ActionCard {...defaultProps} brandColor="#FF0000" />);
    const card = screen.getByTestId('card-Test Action');
    expect(card.style.getPropertyValue('--action-brand-color')).toBe('#FF0000');
  });

  it('should use default gray brand color when brandColor is empty', () => {
    render(<ActionCard {...defaultProps} brandColor="" />);
    const card = screen.getByTestId('card-Test Action');
    expect(card.style.getPropertyValue('--action-brand-color')).toBe('#808080');
  });

  it('should use default gray brand color when brandColor is undefined', () => {
    render(<ActionCard {...defaultProps} />);
    const card = screen.getByTestId('card-Test Action');
    expect(card.style.getPropertyValue('--action-brand-color')).toBe('#808080');
  });

  it('should render run status badge when runData has status', () => {
    render(<ActionCard {...defaultProps} runData={{ status: 'Succeeded' } as any} />);
    expect(screen.getByTestId('run-status-badge')).toHaveTextContent('Succeeded');
  });

  it('should render error badge when there are error messages and no run data', () => {
    render(<ActionCard {...defaultProps} errorMessages={['Error 1', 'Error 2']} />);
    expect(screen.getByTestId('error-badge')).toHaveTextContent('Error 1,Error 2');
  });

  it('should prefer run status badge over error badge when both present', () => {
    render(<ActionCard {...defaultProps} runData={{ status: 'Failed' } as any} errorMessages={['Error 1']} />);
    expect(screen.getByTestId('run-status-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('error-badge')).not.toBeInTheDocument();
  });

  it('should not render badges when no run data or errors', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.queryByTestId('run-status-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-badge')).not.toBeInTheDocument();
  });

  it('should render collapse toggle for scope nodes', () => {
    const handleCollapse = vi.fn();
    render(<ActionCard {...defaultProps} isScope={true} collapsed={false} handleCollapse={handleCollapse} />);
    expect(screen.getByTestId('collapse-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('collapse-toggle')).toHaveTextContent('Collapse');
  });

  it('should render collapse toggle with collapsed state', () => {
    render(<ActionCard {...defaultProps} isScope={true} collapsed={true} handleCollapse={vi.fn()} />);
    expect(screen.getByTestId('collapse-toggle')).toHaveTextContent('Expand');
  });

  it('should not render collapse toggle for non-scope nodes', () => {
    render(<ActionCard {...defaultProps} isScope={false} />);
    expect(screen.queryByTestId('collapse-toggle')).not.toBeInTheDocument();
  });

  it('should have role button', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.getByTestId('card-Test Action')).toHaveAttribute('role', 'button');
  });

  it('should set id with msla-node prefix', () => {
    render(<ActionCard {...defaultProps} id="my-node-id" />);
    expect(screen.getByTestId('card-Test Action')).toHaveAttribute('id', 'msla-node-my-node-id');
  });

  it('should generate correct alt text with both connector and operation name', () => {
    render(<ActionCard {...defaultProps} connectorName="HTTP" title="Send Request" />);
    expect(screen.getByTestId('card-Send Request')).toHaveAttribute('aria-label', 'Send Request operation, HTTP connector');
  });

  it('should generate correct alt text with connector name only', () => {
    render(<ActionCard {...defaultProps} connectorName="HTTP" title="" />);
    expect(screen.getByTestId('card-')).toHaveAttribute('aria-label', 'HTTP connector');
  });

  it('should generate correct alt text with operation name only', () => {
    render(<ActionCard {...defaultProps} title="Send Request" />);
    expect(screen.getByTestId('card-Send Request')).toHaveAttribute('aria-label', 'Send Request operation');
  });

  it('should handle Enter key press to trigger onClick', () => {
    const onClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={onClick} />);
    fireEvent.keyDown(screen.getByTestId('card-Test Action'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should handle Space key press to trigger onClick', () => {
    const onClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={onClick} />);
    fireEvent.keyDown(screen.getByTestId('card-Test Action'), { key: ' ' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should handle Delete key press to trigger onDeleteClick', () => {
    const onDeleteClick = vi.fn();
    render(<ActionCard {...defaultProps} onDeleteClick={onDeleteClick} />);
    fireEvent.keyDown(screen.getByTestId('card-Test Action'), { key: 'Delete' });
    expect(onDeleteClick).toHaveBeenCalledOnce();
  });

  it('should handle Ctrl+C to trigger onCopyClick', () => {
    const onCopyClick = vi.fn();
    render(<ActionCard {...defaultProps} onCopyClick={onCopyClick} />);
    fireEvent.keyDown(screen.getByTestId('card-Test Action'), { key: 'c', ctrlKey: true });
    expect(onCopyClick).toHaveBeenCalledOnce();
  });

  it('should focus element when setFocus is true', () => {
    render(<ActionCard {...defaultProps} setFocus={true} nodeIndex={0} />);
    expect(screen.getByTestId('card-Test Action')).toHaveFocus();
  });
});
