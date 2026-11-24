import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { createRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionNodeCard, DesignerUiScope, NODE_HOVER_CARD_IGNORE_ATTRIBUTE, NodeHoverCard, NodeInfoCard, nodeHoverCardTiming } from '../..';
import type { NodeHoverCardProps } from '../..';

// Each card's details text is `${label} details`; the trigger wrapper carries `${label}-trigger`.
const Hover = ({ label, children, ...props }: Partial<NodeHoverCardProps> & { label: string; children?: ReactNode }) => (
  <NodeHoverCard card={`${label} details`} data-testid={`${label}-trigger`} {...props}>
    {children ?? <ActionNodeCard title={label} />}
  </NodeHoverCard>
);
const trigger = (label: string) => screen.getByTestId(`${label}-trigger`);
const hover = (label: string) => fireEvent.mouseOver(trigger(label));
const leave = (label: string) => fireEvent.mouseLeave(trigger(label));
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const isOpen = (label: string) => screen.queryByText(`${label} details`) !== null;
// The PopoverSurface wraps the `id` div that holds the card content; mouseenter does not bubble, so target it directly.
const surfaceOf = (label: string) => screen.getByText(`${label} details`).parentElement as HTMLElement;
// jsdom has no input modality, so keyboard focus is simulated with the marker Fluent writes for keyboard navigation.
const keyboardFocus = (element: HTMLElement) => {
  element.setAttribute('data-fui-focus-visible', '');
  act(() => element.focus());
};

afterEach(() => {
  vi.useRealTimers();
});

describe('NodeHoverCard scoped coordination (H01, H02)', () => {
  it('H01 opens one card per scope while sibling and nested enabled scopes stay independent', () => {
    vi.useFakeTimers();
    const view = (mode: 'light' | 'dark') => (
      <>
        <DesignerUiScope mode={mode} tokens={{ 'node-surface': mode === 'dark' ? '#111111' : '#ffffff' }}>
          <Hover label="A" />
          <Hover label="B" />
          <DesignerUiScope>
            <Hover label="D" />
          </DesignerUiScope>
        </DesignerUiScope>
        <DesignerUiScope>
          <Hover label="C" />
        </DesignerUiScope>
      </>
    );
    const { rerender } = render(view('light'));
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
    hover('B');
    advance(600);
    // B's real open replaces A within the same scope.
    expect(isOpen('B')).toBe(true);
    expect(isOpen('A')).toBe(false);
    hover('C');
    hover('D');
    advance(600);
    expect([isOpen('B'), isOpen('C'), isOpen('D')]).toEqual([true, true, true]);
    // Mode/token rerenders must keep the same coordinator, so ownership still transfers afterwards.
    rerender(view('dark'));
    expect(isOpen('B')).toBe(true);
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
    expect(isOpen('B')).toBe(false);
    expect([isOpen('C'), isOpen('D')]).toEqual([true, true]);
  });

  it('H02 leaves unscoped cards, disabled scopes and disabled nested scopes uncoordinated', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <>
        <Hover label="U1" />
        <Hover label="U2" />
      </>
    );
    hover('U1');
    hover('U2');
    advance(600);
    // No app-global fallback: two unscoped cards can be open together.
    expect([isOpen('U1'), isOpen('U2')]).toEqual([true, true]);
    unmount();

    render(
      <>
        <DesignerUiScope enabled={false} data-testid="off">
          <Hover label="X1" />
          <Hover label="X2" />
        </DesignerUiScope>
        <DesignerUiScope>
          <DesignerUiScope enabled={false} data-testid="nested-off">
            <Hover label="N1" />
            <Hover label="N2" />
          </DesignerUiScope>
        </DesignerUiScope>
      </>
    );
    ['X1', 'X2', 'N1', 'N2'].forEach(hover);
    advance(600);
    // A disabled nested scope must not fall through to its enabled parent's coordinator.
    expect(['X1', 'X2', 'N1', 'N2'].map(isOpen)).toEqual([true, true, true, true]);
    for (const id of ['off', 'nested-off']) {
      const scope = screen.getByTestId(id);
      expect(scope).not.toHaveAttribute('data-designer-ui-v2');
      expect(scope.getAttribute('style') ?? '').not.toContain('--designer-ui-v2-');
      expect(scope.querySelector('[data-designer-ui-v2-outlet]')).toBeNull();
    }
  });
});

describe('NodeHoverCard timing (H03-H05)', () => {
  it('H03 opens at exactly 600ms and closes at exactly 200ms by default', () => {
    vi.useFakeTimers();
    expect(nodeHoverCardTiming).toEqual({ openDelay: 600, closeDelay: 200 });
    render(
      <DesignerUiScope>
        <Hover label="A" />
      </DesignerUiScope>
    );
    hover('A');
    advance(599);
    expect(isOpen('A')).toBe(false);
    advance(1);
    expect(isOpen('A')).toBe(true);
    leave('A');
    advance(199);
    expect(isOpen('A')).toBe(true);
    advance(1);
    expect(isOpen('A')).toBe(false);
  });

  it('H03 keeps the original deadline when the same direction repeats', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A" />
      </DesignerUiScope>
    );
    hover('A');
    advance(300);
    hover('A');
    advance(300);
    expect(isOpen('A')).toBe(true);
    leave('A');
    advance(100);
    leave('A');
    advance(100);
    expect(isOpen('A')).toBe(false);
  });

  it('H03 honours explicit and zero delays', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A" openDelay={50} closeDelay={75} />
        <Hover label="Z" openDelay={0} closeDelay={0} />
      </DesignerUiScope>
    );
    hover('A');
    advance(49);
    expect(isOpen('A')).toBe(false);
    advance(1);
    expect(isOpen('A')).toBe(true);
    leave('A');
    advance(74);
    expect(isOpen('A')).toBe(true);
    advance(1);
    expect(isOpen('A')).toBe(false);
    hover('Z');
    advance(0);
    expect(isOpen('Z')).toBe(true);
    leave('Z');
    advance(0);
    expect(isOpen('Z')).toBe(false);
  });

  it('H04 lets only the latest pending card open and survives the other card unmounting', () => {
    vi.useFakeTimers();
    const view = (withA: boolean) => (
      <DesignerUiScope>
        {withA ? <Hover label="A" /> : null}
        <Hover label="B" />
      </DesignerUiScope>
    );
    const { rerender } = render(view(true));
    hover('A');
    advance(300);
    hover('B');
    advance(1000);
    expect(isOpen('A')).toBe(false);
    expect(isOpen('B')).toBe(true);

    leave('B');
    advance(200);
    hover('A');
    advance(300);
    hover('B');
    // A's identity-checked cleanup must not cancel B's pending slot.
    rerender(view(false));
    advance(600);
    expect(isOpen('B')).toBe(true);

    rerender(view(true));
    expect(isOpen('B')).toBe(true);
    rerender(view(false));
    advance(1000);
    expect(isOpen('B')).toBe(true);
  });

  it('H05 keeps the open card until a pending card actually opens', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A" />
        <Hover label="B" />
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    hover('B');
    advance(599);
    // Pending B does not seize A: the user keeps reading A until B's deadline.
    expect(isOpen('A')).toBe(true);
    expect(isOpen('B')).toBe(false);
    advance(1);
    expect(isOpen('A')).toBe(false);
    expect(isOpen('B')).toBe(true);

    leave('B');
    advance(200);
    hover('A');
    advance(600);
    hover('B');
    advance(300);
    leave('B');
    advance(1000);
    // Cancelling B leaves A open and still independently closable/reopenable.
    expect(isOpen('A')).toBe(true);
    expect(isOpen('B')).toBe(false);
    leave('A');
    advance(200);
    expect(isOpen('A')).toBe(false);
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
  });

  it('H04 disabling a superseded owner cannot cancel its neighbour pending or open ownership', () => {
    vi.useFakeTimers();
    const view = (disabled: boolean) => (
      <DesignerUiScope>
        <Hover label="A" disabled={disabled} />
        <Hover label="B" />
      </DesignerUiScope>
    );
    const { rerender } = render(view(false));
    hover('A');
    advance(300);
    hover('B');
    rerender(view(true));
    advance(600);
    expect(isOpen('A')).toBe(false);
    expect(isOpen('B')).toBe(true);
    rerender(view(false));
    rerender(view(true));
    advance(1000);
    expect(isOpen('B')).toBe(true);
  });
});

describe('NodeHoverCard activation (H06-H09)', () => {
  const ToolNode = () => (
    <div>
      <ActionNodeCard title="Agent" />
      <button type="button" aria-label="Add tool" {...{ [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: '' }}>
        <svg data-testid="tool-icon">
          <path data-testid="tool-path" d="M0 0" />
        </svg>
      </button>
    </div>
  );

  it('H06 cancels opening and schedules close inside ignored descendants, including SVG children', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A">
          <ToolNode />
        </Hover>
      </DesignerUiScope>
    );
    fireEvent.mouseOver(screen.getByText('Agent'));
    advance(300);
    fireEvent.mouseOver(screen.getByTestId('tool-path'));
    advance(1000);
    expect(isOpen('A')).toBe(false);

    fireEvent.mouseOver(screen.getByText('Agent'));
    advance(600);
    expect(isOpen('A')).toBe(true);
    fireEvent.mouseOver(screen.getByTestId('tool-icon'));
    advance(199);
    expect(isOpen('A')).toBe(true);
    advance(1);
    expect(isOpen('A')).toBe(false);

    fireEvent.mouseOver(screen.getByText('Agent'));
    advance(600);
    expect(isOpen('A')).toBe(true);
  });

  it('H06 ignores markers only inside the trigger, not on host ancestors', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <div {...{ [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: '' }}>
          <Hover label="A" />
        </div>
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
  });

  it('H07 opens on keyboard-visible focus only, including semantic button triggers', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A">
          <button type="button">Node button</button>
        </Hover>
        <Hover label="B">
          <ActionNodeCard title="Plain" role="button" tabIndex={0} />
        </Hover>
      </DesignerUiScope>
    );
    // Click-restored or programmatic focus has no keyboard marker and must not open.
    act(() => screen.getByRole('button', { name: 'Plain' }).focus());
    advance(1000);
    expect(isOpen('B')).toBe(false);
    keyboardFocus(screen.getByRole('button', { name: 'Node button' }));
    advance(600);
    expect(isOpen('A')).toBe(true);
    fireEvent.mouseOver(screen.getByRole('button', { name: 'Node button' }));
    expect(isOpen('A')).toBe(true);
  });

  it('H07 opens through an actual Tab inside FluentProvider', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FluentProvider theme={webLightTheme}>
        <DesignerUiScope>
          <Hover label="A">
            <ActionNodeCard title="Tab target" role="button" tabIndex={0} />
          </Hover>
        </DesignerUiScope>
      </FluentProvider>
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Tab target' })).toHaveFocus();
    advance(600);
    expect(isOpen('A')).toBe(true);
  });

  it('H07 cancels pending keyboard activation when focus moves to an unmarked trigger descendant', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A">
          <div>
            <button type="button">Keyboard target</button>
            <button type="button">Restored target</button>
          </div>
        </Hover>
      </DesignerUiScope>
    );
    keyboardFocus(screen.getByRole('button', { name: 'Keyboard target' }));
    advance(300);
    act(() => screen.getByRole('button', { name: 'Restored target' }).focus());
    advance(1000);
    expect(isOpen('A')).toBe(false);
  });

  const OwnerHarness = ({ onOwner }: { onOwner?: (owner: HTMLDivElement | null) => void }) => {
    const [owner, setOwner] = useState<HTMLDivElement | null>(null);
    return (
      <DesignerUiScope>
        <div
          tabIndex={0}
          data-testid="owner"
          ref={(element) => {
            setOwner(element);
            onOwner?.(element);
          }}
        >
          <NodeHoverCard
            externalFocusTarget={owner}
            card={
              <NodeInfoCard
                category="action"
                icon={null}
                title="Owner details"
                footer={<button type="button">Edit test data</button>}
                actions={<button type="button">Pin</button>}
              />
            }
          >
            <ToolNode />
          </NodeHoverCard>
          <button type="button">Branch</button>
        </div>
      </DesignerUiScope>
    );
  };
  const ownerOpen = () => screen.queryByText('Owner details') !== null;

  it('H08 admits only the exact external owner and keeps focus transfers into the surface', () => {
    vi.useFakeTimers();
    render(<OwnerHarness />);
    const owner = screen.getByTestId('owner');
    keyboardFocus(screen.getByRole('button', { name: 'Branch' }));
    keyboardFocus(screen.getByRole('button', { name: 'Add tool' }));
    advance(1000);
    // Sibling branch controls and ignored tool buttons inside the owner never open the parent card.
    expect(ownerOpen()).toBe(false);

    keyboardFocus(owner);
    advance(600);
    expect(ownerOpen()).toBe(true);
    // The owner's description token must resolve to the element that holds the card content.
    const describedBy = owner.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)).toContainElement(screen.getByText('Owner details'));

    act(() => screen.getByRole('button', { name: 'Edit test data' }).focus());
    advance(1000);
    expect(ownerOpen()).toBe(true);
    act(() => screen.getByRole('button', { name: 'Pin' }).focus());
    advance(1000);
    expect(ownerOpen()).toBe(true);

    keyboardFocus(screen.getByRole('button', { name: 'Branch' }));
    advance(200);
    expect(ownerOpen()).toBe(false);
    expect(owner).not.toHaveAttribute('aria-describedby');
  });

  it('H09 transfers pointer to the surface within the close grace', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A" />
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    leave('A');
    advance(150);
    fireEvent.mouseEnter(surfaceOf('A'));
    advance(1000);
    expect(isOpen('A')).toBe(true);
    fireEvent.mouseLeave(surfaceOf('A'));
    advance(199);
    expect(isOpen('A')).toBe(true);
    advance(1);
    expect(isOpen('A')).toBe(false);
  });

  it('H09 keeps the card while focus moves within the surface and closes after focus leaves both', () => {
    vi.useFakeTimers();
    render(
      <>
        <DesignerUiScope>
          <NodeHoverCard
            data-testid="A-trigger"
            card={
              <>
                <span>A details</span>
                <button type="button">First</button>
                <button type="button">Second</button>
              </>
            }
          >
            <ActionNodeCard title="A" />
          </NodeHoverCard>
        </DesignerUiScope>
        <button type="button">Outside</button>
      </>
    );
    hover('A');
    advance(600);
    act(() => screen.getByRole('button', { name: 'First' }).focus());
    leave('A');
    advance(1000);
    expect(isOpen('A')).toBe(true);
    act(() => screen.getByRole('button', { name: 'Second' }).focus());
    advance(1000);
    expect(isOpen('A')).toBe(true);
    act(() => screen.getByRole('button', { name: 'Outside' }).focus());
    advance(199);
    expect(isOpen('A')).toBe(true);
    advance(1);
    expect(isOpen('A')).toBe(false);
  });

  it('H09 does not dismiss keyboard focus when only the pointer leaves', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A">
          <ActionNodeCard title="Keyboard" role="button" tabIndex={0} />
        </Hover>
      </DesignerUiScope>
    );
    keyboardFocus(screen.getByRole('button', { name: 'Keyboard' }));
    advance(600);
    hover('A');
    leave('A');
    advance(1000);
    expect(isOpen('A')).toBe(true);
  });
});

describe('NodeHoverCard explicit close (H10)', () => {
  it('closes immediately on trigger Escape, cancels pending opens and still calls the host key handler', () => {
    vi.useFakeTimers();
    const onKeyDown = vi.fn();
    render(
      <DesignerUiScope>
        <Hover label="A" onKeyDown={onKeyDown} />
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    fireEvent.keyDown(trigger('A'), { key: 'Escape' });
    expect(isOpen('A')).toBe(false);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(isOpen('A')).toBe(false);

    hover('A');
    advance(300);
    fireEvent.keyDown(trigger('A'), { key: 'Escape' });
    advance(1000);
    expect(isOpen('A')).toBe(false);
  });

  it('closes on surface Escape and restores focus without reopening', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <NodeHoverCard data-testid="A-trigger" card={<button type="button">A details</button>}>
          <ActionNodeCard title="Node" role="button" tabIndex={0} />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    const node = screen.getByRole('button', { name: 'Node' });
    // A stale keyboard marker would reopen the card if restoration were treated as fresh activation.
    node.setAttribute('data-fui-focus-visible', '');
    hover('A');
    advance(600);
    const inside = screen.getByRole('button', { name: 'A details' });
    act(() => inside.focus());
    fireEvent.keyDown(inside, { key: 'Escape' });
    expect(isOpen('A')).toBe(false);
    expect(node).toHaveFocus();
    advance(1000);
    expect(isOpen('A')).toBe(false);
  });

  it('closes from the external owner Escape, render-prop close and Dismiss', () => {
    vi.useFakeTimers();
    const external = document.createElement('button');
    document.body.append(external);
    render(
      <DesignerUiScope>
        <NodeHoverCard
          externalFocusTarget={external}
          data-testid="A-trigger"
          card={(close) => (
            <NodeInfoCard
              category="action"
              icon={null}
              title="A details"
              onDismiss={close}
              actions={<button onClick={close}>Done</button>}
            />
          )}
        >
          <ActionNodeCard title="Node" />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    keyboardFocus(external);
    advance(600);
    expect(isOpen('A')).toBe(true);
    fireEvent.keyDown(external, { key: 'Escape' });
    expect(isOpen('A')).toBe(false);

    hover('A');
    advance(300);
    fireEvent.keyDown(external, { key: 'Escape' });
    advance(1000);
    expect(isOpen('A')).toBe(false);

    hover('A');
    advance(600);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(isOpen('A')).toBe(false);

    hover('A');
    advance(600);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(isOpen('A')).toBe(false);
    advance(1000);
    expect(isOpen('A')).toBe(false);
    external.remove();
  });

  it('honours Fluent outside dismissal without reopening after the deadline', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FluentProvider theme={webLightTheme}>
        <DesignerUiScope>
          <Hover label="A">
            <ActionNodeCard title="Outside target" role="button" tabIndex={0} />
          </Hover>
        </DesignerUiScope>
        <button type="button">Outside dismissal</button>
      </FluentProvider>
    );
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
    await act(async () => user.click(screen.getByRole('button', { name: 'Outside dismissal' })));
    // Fluent may retain its exiting surface for motion; the active description disappears immediately on dismissal.
    expect(screen.getByRole('button', { name: 'Outside target' })).not.toHaveAttribute('aria-describedby');
    advance(1000);
    expect(isOpen('A')).toBe(false);
  });
});

describe('NodeHoverCard cleanup and wiring (H11-H14)', () => {
  it('H11 clears owned timers on unmount while pending and keeps neighbours usable', () => {
    vi.useFakeTimers();
    const view = (withA: boolean) => (
      <DesignerUiScope>
        {withA ? <Hover label="A" /> : null}
        <Hover label="B" />
      </DesignerUiScope>
    );
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    const { rerender, unmount } = render(view(true));
    // Fluent/tabster may own unrelated timers, so only the delta produced by this card is asserted.
    const baseline = vi.getTimerCount();
    hover('A');
    expect(vi.getTimerCount()).toBe(baseline + 1);
    rerender(view(false));
    expect(vi.getTimerCount()).toBe(baseline);
    advance(1000);
    expect(isOpen('A')).toBe(false);
    hover('B');
    advance(600);
    expect(isOpen('B')).toBe(true);
    leave('B');
    clearSpy.mockClear();
    unmount();
    // The pending close grace is cleared by the unmount cleanup rather than firing into an unmounted card.
    expect(clearSpy).toHaveBeenCalled();
    advance(1000);
    clearSpy.mockRestore();
  });

  it('H11 cancels pending and open cards when disabled and reopens only after re-enabling', () => {
    vi.useFakeTimers();
    const view = (disabled: boolean) => (
      <DesignerUiScope>
        <Hover label="A" disabled={disabled} />
      </DesignerUiScope>
    );
    const { rerender } = render(view(false));
    hover('A');
    advance(300);
    rerender(view(true));
    advance(1000);
    expect(isOpen('A')).toBe(false);
    hover('A');
    advance(1000);
    expect(isOpen('A')).toBe(false);

    rerender(view(false));
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
    rerender(view(true));
    expect(isOpen('A')).toBe(false);
  });

  it('H11 moves listeners and description tokens when the external target is replaced', () => {
    vi.useFakeTimers();
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);
    const view = (external: HTMLElement) => (
      <DesignerUiScope>
        <Hover label="A" externalFocusTarget={external} />
      </DesignerUiScope>
    );
    const { rerender } = render(view(first));
    keyboardFocus(first);
    advance(600);
    expect(first).toHaveAttribute('aria-describedby');
    rerender(view(second));
    expect(first).not.toHaveAttribute('aria-describedby');
    expect(isOpen('A')).toBe(false);
    act(() => second.blur());
    act(() => first.blur());
    advance(1000);
    expect(isOpen('A')).toBe(false);
    keyboardFocus(first);
    advance(1000);
    // The old owner's listener is gone.
    expect(isOpen('A')).toBe(false);
    keyboardFocus(second);
    advance(600);
    expect(isOpen('A')).toBe(true);
    first.remove();
    second.remove();
  });

  it('H11 cancels pointer-pending work on external-target replacement or removal', () => {
    vi.useFakeTimers();
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);
    const view = (external: HTMLElement | null) => (
      <DesignerUiScope>
        <Hover label="A" externalFocusTarget={external} />
        <Hover label="B" />
      </DesignerUiScope>
    );
    const { rerender, unmount } = render(view(first));
    hover('A');
    advance(300);
    rerender(view(second));
    advance(1000);
    expect(isOpen('A')).toBe(false);
    hover('A');
    advance(600);
    rerender(view(null));
    expect(isOpen('A')).toBe(false);
    hover('B');
    advance(600);
    expect(isOpen('B')).toBe(true);
    unmount();
    first.remove();
    second.remove();
  });

  it('H11 releases ownership when a card leaves its scope', () => {
    vi.useFakeTimers();
    const view = (enabled: boolean) => (
      <DesignerUiScope enabled={enabled}>
        <Hover label="A" />
        <Hover label="B" />
      </DesignerUiScope>
    );
    const { rerender } = render(view(true));
    hover('A');
    advance(600);
    rerender(view(false));
    // Changing coordinator membership drops the stale open registration.
    expect(isOpen('A')).toBe(false);
    hover('A');
    hover('B');
    advance(600);
    expect([isOpen('A'), isOpen('B')]).toEqual([true, true]);
    rerender(view(true));
    hover('A');
    advance(600);
    hover('B');
    advance(600);
    expect([isOpen('A'), isOpen('B')]).toEqual([false, true]);
  });

  it('H11 cancels opening when scope membership changes and does not reopen on re-enabling', () => {
    vi.useFakeTimers();
    const view = (enabled: boolean) => (
      <DesignerUiScope enabled={enabled}>
        <Hover label="A" />
      </DesignerUiScope>
    );
    const { rerender } = render(view(true));
    hover('A');
    advance(300);
    rerender(view(false));
    advance(1000);
    expect(isOpen('A')).toBe(false);
    rerender(view(true));
    advance(1000);
    expect(isOpen('A')).toBe(false);
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
  });

  it('H12 forwards both refs, fires host handlers once, preserves host aria tokens and never autofocuses', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLDivElement>();
    const handlers = {
      onMouseOver: vi.fn(),
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      onKeyDown: vi.fn(),
    };
    const external = document.createElement('button');
    document.body.append(external);
    // NodeHoverCard is rendered directly: the `Hover` helper is a plain function component and would swallow `ref`.
    const { unmount } = render(
      <DesignerUiScope>
        <NodeHoverCard
          card="A details"
          data-testid="A-trigger"
          ref={ref}
          triggerRef={triggerRef}
          externalFocusTarget={external}
          {...handlers}
        >
          <ActionNodeCard title="Node" role="button" tabIndex={0} />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    expect(ref.current).toBe(trigger('A'));
    expect(triggerRef.current).toBe(trigger('A'));
    const node = screen.getByRole('button', { name: 'Node' });
    fireEvent.mouseOver(node);
    fireEvent.mouseLeave(trigger('A'));
    act(() => node.focus());
    act(() => node.blur());
    fireEvent.keyDown(node, { key: 'a' });
    for (const handler of Object.values(handlers)) {
      expect(handler).toHaveBeenCalledTimes(1);
    }
    hover('A');
    advance(600);
    expect(isOpen('A')).toBe(true);
    expect(document.body).toHaveFocus();
    external.setAttribute('aria-describedby', `${external.getAttribute('aria-describedby')} host-added`);
    leave('A');
    advance(200);
    expect(external).toHaveAttribute('aria-describedby', 'host-added');
    unmount();
    expect(ref.current).toBeNull();
    expect(triggerRef.current).toBeNull();
    external.remove();
  });

  it('H12 preserves descriptions added to the DOM-forwarding child while open through close and unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <DesignerUiScope>
        <Hover label="A">
          <ActionNodeCard title="Described" role="button" aria-describedby="existing" />
        </Hover>
      </DesignerUiScope>
    );
    const node = screen.getByRole('button', { name: 'Described' });
    hover('A');
    advance(600);
    const cardId = screen.getByText('A details').id;
    expect(node.getAttribute('aria-describedby')?.split(' ')).toContain(cardId);
    node.setAttribute('aria-describedby', `${node.getAttribute('aria-describedby')} host-added`);
    leave('A');
    advance(200);
    expect(node).toHaveAttribute('aria-describedby', 'existing host-added');
    hover('A');
    advance(600);
    unmount();
    expect(node).toHaveAttribute('aria-describedby', 'existing host-added');
  });

  it('H12 reapplies its description token after host prop updates without duplicating it', () => {
    vi.useFakeTimers();
    const view = (description: string) => (
      <DesignerUiScope>
        <Hover label="A">
          <ActionNodeCard title="Described" role="button" aria-describedby={description} />
        </Hover>
      </DesignerUiScope>
    );
    const { rerender } = render(view('original'));
    hover('A');
    advance(600);
    const cardId = screen.getByText('A details').id;
    rerender(view('updated'));
    expect(screen.getByRole('button', { name: 'Described' })).toHaveAttribute('aria-describedby', `updated ${cardId}`);
    rerender(view('updated'));
    expect(screen.getByRole('button', { name: 'Described' })).toHaveAttribute('aria-describedby', `updated ${cardId}`);
    leave('A');
    advance(200);
    expect(screen.getByRole('button', { name: 'Described' })).toHaveAttribute('aria-describedby', 'updated');
  });

  it('H12 describes the actual DOM-forwarding child rather than assuming its first DOM element', () => {
    vi.useFakeTimers();
    const NestedTrigger = (props: HTMLAttributes<HTMLButtonElement>) => (
      <div data-testid="layout-only">
        <button type="button" {...props}>
          Nested node
        </button>
      </div>
    );
    render(
      <DesignerUiScope>
        <Hover label="A">
          <NestedTrigger aria-describedby="existing" />
        </Hover>
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    const node = screen.getByRole('button', { name: 'Nested node' });
    expect(node).toHaveAttribute('aria-describedby', `existing ${screen.getByText('A details').id}`);
    expect(screen.getByTestId('layout-only')).not.toHaveAttribute('aria-describedby');
    node.setAttribute('aria-describedby', `${node.getAttribute('aria-describedby')} host-added`);
    leave('A');
    advance(200);
    expect(node).toHaveAttribute('aria-describedby', 'existing host-added');
  });

  it('H13 uses the iframe window for timers and the iframe scope outlet for details', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const owner = iframe.contentDocument as Document;
    const ownerWindow = owner.defaultView as Window;
    const setTimeoutSpy = vi.spyOn(ownerWindow, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(ownerWindow, 'clearTimeout');
    const container = owner.createElement('div');
    owner.body.append(container);
    const { unmount } = render(
      <DesignerUiScope data-testid="iframe-scope" tokens={{ 'node-surface': '#123456' }}>
        <NodeHoverCard openDelay={10} closeDelay={10} card="Iframe details" data-testid="iframe-trigger">
          <div>
            <ActionNodeCard title="Iframe node" />
            <button type="button" {...{ [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: '' }}>
              <svg data-testid="iframe-svg" />
            </button>
          </div>
        </NodeHoverCard>
      </DesignerUiScope>,
      { container }
    );
    const view = within(container);
    fireEvent.mouseOver(view.getByTestId('iframe-svg'));
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    fireEvent.mouseOver(view.getByText('Iframe node'));
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const details = await view.findByText('Iframe details');
    expect(details.ownerDocument).toBe(owner);
    const scope = view.getByTestId('iframe-scope');
    expect(scope).toContainElement(details);
    expect(scope.style.getPropertyValue('--designer-ui-v2-node-surface')).toBe('#123456');
    fireEvent.mouseLeave(view.getByTestId('iframe-trigger'));
    const pendingClose = setTimeoutSpy.mock.results.at(-1)?.value;
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(pendingClose);
    iframe.remove();
  });

  it('H14 keeps disabled monitoring cards closed while inactive or status-bearing authoring cards still open', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="Monitor" disabled>
          <ActionNodeCard title="Monitor" status="succeeded" />
        </Hover>
        <Hover label="Dimmed">
          <ActionNodeCard title="Dimmed" inactive />
        </Hover>
        <DesignerUiScope>
          <Hover label="Status">
            <ActionNodeCard title="Status" status="failed" />
          </Hover>
        </DesignerUiScope>
      </DesignerUiScope>
    );
    hover('Monitor');
    hover('Dimmed');
    hover('Status');
    advance(1000);
    expect(isOpen('Monitor')).toBe(false);
    expect(isOpen('Dimmed')).toBe(true);
    // Status never implies monitoring mode: only the explicit `disabled` prop does.
    expect(isOpen('Status')).toBe(true);
  });
});

describe('NodeHoverCard placement', () => {
  const placementOf = async (label: string) => {
    // Positioning resolves asynchronously after open, so wait for the floating layer to commit its placement.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    let element: HTMLElement | null = screen.getByText(`${label} details`);
    while (element && !element.getAttribute('data-popper-placement')) {
      element = element.parentElement;
    }
    return element?.getAttribute('data-popper-placement');
  };

  it('keeps the above default and anchors beside the card when placement is side', async () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <Hover label="A" />
        <Hover label="S" placement="side" />
      </DesignerUiScope>
    );
    hover('A');
    advance(600);
    vi.useRealTimers();
    expect(await placementOf('A')).toMatch(/^top/);
    vi.useFakeTimers();
    hover('S');
    advance(600);
    vi.useRealTimers();
    // Side placement keeps the card off the upstream node and edge above the trigger.
    expect(await placementOf('S')).toBe('right-start');
  });
});
