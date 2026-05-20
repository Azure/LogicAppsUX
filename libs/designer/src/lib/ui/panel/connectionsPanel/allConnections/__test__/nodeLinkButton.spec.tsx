// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NodeLinkButton } from '../nodeLinkButton';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDispatch = vi.fn();
const mockUseNodeDisplayName = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../../core', () => ({
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  openPanel: vi.fn((payload: any) => ({ type: 'panel/openPanel', payload })),
}));

describe('NodeLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNodeDisplayName.mockReturnValue('My Test Action');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the node display name', () => {
    render(<NodeLinkButton nodeId="node-1" />);
    expect(screen.getByText('My Test Action')).toBeDefined();
  });

  it('renders with icon when iconUri is provided', () => {
    const { container } = render(<NodeLinkButton nodeId="node-1" iconUri="https://example.com/icon.svg" />);
    const img = container.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('https://example.com/icon.svg');
  });

  it('renders icon without position absolute styling', () => {
    const { container } = render(<NodeLinkButton nodeId="node-1" iconUri="https://example.com/icon.svg" />);
    const img = container.querySelector('img');
    expect(img?.style.position).not.toBe('absolute');
  });

  it('renders button with left-aligned content', () => {
    render(<NodeLinkButton nodeId="node-1" />);
    const button = screen.getByRole('button');
    expect(button.style.justifyContent).toBe('flex-start');
  });

  it('dispatches openPanel with correct payload on click', () => {
    render(<NodeLinkButton nodeId="node-1" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'panel/openPanel',
      payload: { nodeId: 'node-1', panelMode: 'Connection', referencePanelMode: 'Connection' },
    });
  });

  it('passes nodeId to useNodeDisplayName', () => {
    render(<NodeLinkButton nodeId="node-42" />);
    expect(mockUseNodeDisplayName).toHaveBeenCalledWith('node-42');
  });

  it('renders icon with msla-action-icon class', () => {
    const { container } = render(<NodeLinkButton nodeId="node-1" iconUri="https://example.com/icon.svg" />);
    const img = container.querySelector('img');
    expect(img?.classList.contains('msla-action-icon')).toBe(true);
  });
});
