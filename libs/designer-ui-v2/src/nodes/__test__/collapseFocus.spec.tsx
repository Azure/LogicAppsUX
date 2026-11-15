import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentToolsPanel, NodeFrame } from '../..';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(performance.now()), 16));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id));
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('collapse-start focus ownership', () => {
  it.each(['none', 'reveal'] as const)('prefers the frame header action before %s collapse hides the body', (motion) => {
    const tree = (collapsed: boolean) => (
      <NodeFrame
        kind="scope"
        title="Scope"
        motion={motion}
        collapsed={collapsed}
        action={
          <>
            <button type="button" disabled>
              Unavailable
            </button>
            <button type="button" aria-expanded={!collapsed}>
              Toggle scope
            </button>
          </>
        }
      >
        <input aria-label="Draft" defaultValue="original" />
      </NodeFrame>
    );
    const { rerender } = render(tree(false));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'edited' } });
    input.focus();
    rerender(tree(true));
    expect(screen.getByRole('button', { name: 'Toggle scope' })).toHaveFocus();
    act(() => vi.advanceTimersByTime(300));
    rerender(tree(false));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('edited');
    expect(input).not.toHaveFocus();
  });

  it.each(['none', 'reveal'] as const)('retains a temporary frame tabindex until actual blur in %s mode', (motion) => {
    const tree = (collapsed: boolean) => (
      <>
        <button type="button">Outside</button>
        <NodeFrame kind="scope" collapsed={collapsed} motion={motion} data-testid="frame">
          <input aria-label="Draft" />
        </NodeFrame>
      </>
    );
    const { rerender } = render(tree(false));
    screen.getByRole('textbox').focus();
    rerender(tree(true));
    const frame = screen.getByTestId('frame');
    expect(frame).toHaveFocus();
    expect(frame).toHaveAttribute('tabindex', '-1');
    rerender(tree(false));
    expect(frame).toHaveFocus();
    expect(frame).toHaveAttribute('tabindex', '-1');
    screen.getByRole('button', { name: 'Outside' }).focus();
    expect(frame).not.toHaveAttribute('tabindex');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });

  it.each(['none', 'reveal'] as const)('never removes a host frame tabindex after %s focus rescue', (motion) => {
    const tree = (collapsed: boolean) => (
      <NodeFrame kind="scope" collapsed={collapsed} motion={motion} tabIndex={0} data-testid="frame">
        <input aria-label="Draft" />
      </NodeFrame>
    );
    const { rerender } = render(tree(false));
    screen.getByRole('textbox').focus();
    rerender(tree(true));
    const frame = screen.getByTestId('frame');
    expect(frame).toHaveFocus();
    expect(frame).toHaveAttribute('tabindex', '0');
    frame.blur();
    expect(frame).toHaveAttribute('tabindex', '0');
  });

  it.each([false, true])('rescues tools focus before reveal/unmount (reduced motion=%s)', (reducedMotion) => {
    const tree = (expanded: boolean) => (
      <div data-reduce-motion={reducedMotion}>
        <AgentToolsPanel expanded={expanded} onToggleExpanded={vi.fn()}>
          <input aria-label="Tool draft" />
        </AgentToolsPanel>
      </div>
    );
    const { rerender } = render(tree(true));
    const input = screen.getByRole('textbox');
    input.focus();
    rerender(tree(false));
    const toggle = screen.getByRole('button', { name: 'Expand tools' });
    expect(toggle).toHaveFocus();
    act(() => vi.advanceTimersByTime(300));
    expect(toggle).toHaveFocus();
    expect(input).not.toBeInTheDocument();
  });

  it.each([false, true])('uses the tools root without a toggle (reduced motion=%s)', (reducedMotion) => {
    const tree = (expanded: boolean) => (
      <div data-reduce-motion={reducedMotion}>
        <button type="button">Outside</button>
        <AgentToolsPanel expanded={expanded}>
          <input aria-label="Tool draft" />
        </AgentToolsPanel>
      </div>
    );
    const { rerender } = render(tree(true));
    screen.getByRole('textbox').focus();
    rerender(tree(false));
    const panel = screen.getByTestId('agent-tools-panel');
    expect(panel).toHaveFocus();
    expect(panel).toHaveAttribute('tabindex', '-1');
    screen.getByRole('button', { name: 'Outside' }).focus();
    expect(panel).not.toHaveAttribute('tabindex');
  });

  it('preserves the host tools tabindex on fallback and interrupted expansion', () => {
    const tree = (expanded: boolean) => (
      <AgentToolsPanel expanded={expanded} tabIndex={0}>
        <input aria-label="Tool draft" />
      </AgentToolsPanel>
    );
    const { rerender } = render(tree(true));
    const input = screen.getByRole('textbox');
    input.focus();
    rerender(tree(false));
    const panel = screen.getByTestId('agent-tools-panel');
    expect(panel).toHaveFocus();
    rerender(tree(true));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(panel).toHaveFocus();
    panel.blur();
    expect(panel).toHaveAttribute('tabindex', '0');
  });

  it.each(['none', 'reveal'] as const)('keeps external focus when NodeFrame collapses in %s mode', (motion) => {
    const tree = (collapsed: boolean) => (
      <>
        <button type="button">Outside</button>
        <NodeFrame kind="scope" title="Scope" motion={motion} collapsed={collapsed} action={<button type="button">Toggle scope</button>}>
          <input aria-label="Draft" />
        </NodeFrame>
      </>
    );
    const { rerender } = render(tree(false));
    screen.getByRole('textbox').focus();
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    rerender(tree(true));
    expect(outside).toHaveFocus();
  });

  it.each(['none', 'reveal'] as const)('rescues NodeFrame focus after body content is removed in %s mode', (motion) => {
    const tree = (collapsed: boolean, showBodyInput: boolean) => (
      <NodeFrame kind="scope" title="Scope" motion={motion} collapsed={collapsed} action={<button type="button">Toggle scope</button>}>
        {showBodyInput ? <input aria-label="Draft" /> : null}
      </NodeFrame>
    );
    const { rerender } = render(tree(false, true));
    screen.getByRole('textbox').focus();
    rerender(tree(false, false));
    expect(document.activeElement).toBe(document.body);
    rerender(tree(true, false));
    expect(screen.getByRole('button', { name: 'Toggle scope' })).toHaveFocus();
  });

  it('keeps external focus when AgentToolsPanel collapses', () => {
    const tree = (expanded: boolean) => (
      <>
        <button type="button">Outside</button>
        <AgentToolsPanel expanded={expanded} onToggleExpanded={vi.fn()}>
          <input aria-label="Tool draft" />
        </AgentToolsPanel>
      </>
    );
    const { rerender } = render(tree(true));
    screen.getByRole('textbox').focus();
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    rerender(tree(false));
    expect(outside).toHaveFocus();
  });

  it('rescues AgentToolsPanel focus after body content is removed', () => {
    const tree = (expanded: boolean, showBodyInput: boolean) => (
      <AgentToolsPanel expanded={expanded} onToggleExpanded={vi.fn()}>
        {showBodyInput ? <input aria-label="Tool draft" /> : null}
      </AgentToolsPanel>
    );
    const { rerender } = render(tree(true, true));
    screen.getByRole('textbox').focus();
    rerender(tree(true, false));
    expect(document.activeElement).toBe(document.body);
    rerender(tree(false, false));
    expect(screen.getByRole('button', { name: 'Expand tools' })).toHaveFocus();
  });

  it.each(['frame-none', 'frame-reveal', 'tools'] as const)('never steals external focus on initial or subsequent %s collapse', (kind) => {
    const tree = (collapsed: boolean) => (
      <>
        <button type="button">Outside</button>
        {kind === 'tools' ? (
          <AgentToolsPanel expanded={!collapsed}>
            <input aria-label="Draft" />
          </AgentToolsPanel>
        ) : (
          <NodeFrame kind="scope" collapsed={collapsed} motion={kind === 'frame-none' ? 'none' : 'reveal'}>
            <input aria-label="Draft" />
          </NodeFrame>
        )}
      </>
    );
    const { rerender } = render(tree(true));
    expect(document.activeElement).toBe(document.body);
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    rerender(tree(false));
    rerender(tree(true));
    expect(outside).toHaveFocus();
  });
});
