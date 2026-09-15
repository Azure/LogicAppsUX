import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card, type CardProps } from '../index';
import { ScopeCard } from '../scopeCard';

const props: CardProps = {
  id: 'node',
  title: 'Test node',
  brandColor: '#474747',
  drag: () => null,
  dragPreview: () => null,
  draggable: false,
  nodeIndex: 1,
};

describe.each([
  { name: 'Card', Component: Card },
  { name: 'ScopeCard', Component: ScopeCard },
])('$name programmatic focus', ({ Component }) => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const card = (setFocus?: boolean, title = props.title) => (
    <IntlProvider locale="en">
      <Component {...props} title={title} setFocus={setFocus} />
    </IntlProvider>
  );

  it.each([undefined, false])('does not request focus when setFocus=%s', (setFocus) => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(card(setFocus));
    expect(screen.getByRole('button', { name: 'Test node operation' })).not.toHaveFocus();
    expect(focus).not.toHaveBeenCalled();
  });

  it('focuses the actual card with preventScroll on initial mount', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(card(true));
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(screen.getByRole('button', { name: 'Test node operation' })).toHaveFocus();
  });

  it('uses preventScroll for repeated requests but does not refocus on ordinary rerenders or request clearing', () => {
    const { rerender } = render(card(false));
    const target = screen.getByRole('button', { name: 'Test node operation' });
    const focus = vi.spyOn(target, 'focus');
    rerender(card(true));
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(target).toHaveFocus();

    rerender(card(true, 'Updated node'));
    expect(screen.getByRole('button', { name: 'Updated node operation' })).toBe(target);
    expect(focus).toHaveBeenCalledOnce();
    rerender(card(false));
    expect(focus).toHaveBeenCalledOnce();
    target.blur();
    expect(target).not.toHaveFocus();

    rerender(card(true));
    expect(focus).toHaveBeenCalledTimes(2);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(target).toHaveFocus();
  });
});
