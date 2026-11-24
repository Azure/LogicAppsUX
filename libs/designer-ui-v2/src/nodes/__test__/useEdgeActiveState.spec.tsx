import { Button, FluentProvider, webLightTheme } from '@fluentui/react-components';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useEdgeActiveState } from '../..';

function Probe() {
  const { isHovered, isActive, wrapperProps, lineProps, reset } = useEdgeActiveState();
  return (
    <>
      <span data-testid="line" {...lineProps} />
      <div data-testid="wrapper" {...wrapperProps}>
        <Button onClick={reset}>plus</Button>
        <Button>second control</Button>
      </div>
      <Button>elsewhere</Button>
      <output data-testid="hovered">{String(isHovered)}</output>
      <output data-testid="active">{String(isActive)}</output>
    </>
  );
}

const renderProbe = () =>
  render(
    <FluentProvider theme={webLightTheme}>
      <Probe />
    </FluentProvider>
  );

describe('useEdgeActiveState', () => {
  it.each(['line', 'wrapper'])('activates only while the %s is hovered', (target) => {
    renderProbe();
    const surface = screen.getByTestId(target);
    expect(screen.getByTestId('active')).toHaveTextContent('false');
    fireEvent.mouseOver(surface);
    expect(screen.getByTestId('hovered')).toHaveTextContent('true');
    expect(screen.getByTestId('active')).toHaveTextContent('true');
    fireEvent.mouseOut(surface);
    expect(screen.getByTestId('hovered')).toHaveTextContent('false');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('keeps keyboard activation across controls in one wrapper and clears it on exit', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.tab();
    expect(screen.getByRole('button', { name: 'plus' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'plus' })).toHaveAttribute('data-fui-focus-visible');
    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('hovered')).toHaveTextContent('false');
    await user.tab();
    expect(screen.getByRole('button', { name: 'second control' })).toHaveFocus();
    expect(screen.getByTestId('active')).toHaveTextContent('true');
    await user.tab();
    expect(screen.getByRole('button', { name: 'elsewhere' })).toHaveFocus();
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('ignores mouse-click focus after the pointer leaves', async () => {
    const user = userEvent.setup();
    renderProbe();
    const plus = screen.getByRole('button', { name: 'plus' });
    await user.click(plus);
    expect(plus).toHaveFocus();
    expect(plus).not.toHaveAttribute('data-fui-focus-visible');
    await user.unhover(screen.getByTestId('wrapper'));
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('reset clears hover without hiding a keyboard-focused control', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.hover(screen.getByTestId('line'));
    await user.tab();
    fireEvent.click(screen.getByRole('button', { name: 'plus' }));
    expect(screen.getByTestId('hovered')).toHaveTextContent('false');
    expect(screen.getByTestId('active')).toHaveTextContent('true');
  });

  it('preserves hover when focus leaves and clears focus on a blur without a related target', () => {
    renderProbe();
    const plus = screen.getByRole('button', { name: 'plus' });
    plus.setAttribute('data-fui-focus-visible', '');
    fireEvent.focus(plus);
    fireEvent.mouseEnter(screen.getByTestId('line'));
    fireEvent.blur(plus, { relatedTarget: null });
    expect(screen.getByTestId('active')).toHaveTextContent('true');
    fireEvent.mouseLeave(screen.getByTestId('line'));
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('registers no document or window listeners on mount, updates, reset or unmount', () => {
    // Warm React's delegated event infrastructure before observing this hook in isolation.
    const warmup = renderHook(() => undefined);
    warmup.unmount();
    const documentListener = vi.spyOn(document, 'addEventListener');
    const windowListener = vi.spyOn(window, 'addEventListener');
    const { result, unmount } = renderHook(() => useEdgeActiveState());
    act(() => result.current.lineProps.onMouseEnter());
    expect(result.current.isActive).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isActive).toBe(false);
    unmount();
    expect(documentListener).not.toHaveBeenCalled();
    expect(windowListener).not.toHaveBeenCalled();
  });

  it('keeps callback identities stable across hover, focus and reset transitions', () => {
    const { result } = renderHook(() => useEdgeActiveState());
    const initialWrapperProps = { ...result.current.wrapperProps };
    const initialLineProps = { ...result.current.lineProps };
    const initialReset = result.current.reset;

    act(() => result.current.lineProps.onMouseEnter());
    expect(result.current.isActive).toBe(true);
    expect(result.current.wrapperProps.onMouseEnter).toBe(initialWrapperProps.onMouseEnter);
    expect(result.current.wrapperProps.onMouseLeave).toBe(initialWrapperProps.onMouseLeave);
    expect(result.current.wrapperProps.onFocus).toBe(initialWrapperProps.onFocus);
    expect(result.current.wrapperProps.onBlur).toBe(initialWrapperProps.onBlur);
    expect(result.current.lineProps.onMouseEnter).toBe(initialLineProps.onMouseEnter);
    expect(result.current.lineProps.onMouseLeave).toBe(initialLineProps.onMouseLeave);
    expect(result.current.reset).toBe(initialReset);

    act(() => result.current.reset());
    expect(result.current.isActive).toBe(false);
    expect(result.current.reset).toBe(initialReset);
  });

  it('isolates state across sibling edge instances when focus moves from one wrapper to another', () => {
    function DualEdgeProbe() {
      const first = useEdgeActiveState();
      const second = useEdgeActiveState();
      return (
        <FluentProvider theme={webLightTheme}>
          <div data-testid="wrapper-a" {...first.wrapperProps}>
            <Button>edge-a</Button>
          </div>
          <div data-testid="wrapper-b" {...second.wrapperProps}>
            <Button>edge-b</Button>
          </div>
          <output data-testid="active-a">{String(first.isActive)}</output>
          <output data-testid="active-b">{String(second.isActive)}</output>
        </FluentProvider>
      );
    }

    render(<DualEdgeProbe />);
    const buttonA = screen.getByRole('button', { name: 'edge-a' });
    const buttonB = screen.getByRole('button', { name: 'edge-b' });

    buttonA.setAttribute('data-fui-focus-visible', '');
    fireEvent.focus(buttonA);
    expect(screen.getByTestId('active-a')).toHaveTextContent('true');
    expect(screen.getByTestId('active-b')).toHaveTextContent('false');

    fireEvent.blur(buttonA, { relatedTarget: buttonB });
    buttonB.setAttribute('data-fui-focus-visible', '');
    fireEvent.focus(buttonB);
    expect(screen.getByTestId('active-a')).toHaveTextContent('false');
    expect(screen.getByTestId('active-b')).toHaveTextContent('true');
  });
});
