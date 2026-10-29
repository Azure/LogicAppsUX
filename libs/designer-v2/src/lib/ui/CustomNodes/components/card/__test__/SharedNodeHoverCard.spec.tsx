import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Intl from 'react-intl';
import { SharedNodeHoverCard } from '../SharedNodeHoverCard';

const props = {
  category: 'action' as const,
  icon: <span data-testid="operation-icon" />,
  title: 'Send request',
  subtitle: 'HTTP',
  description: 'Real resolved operation description',
  configured: true,
};

function openHover() {
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Operation' }).parentElement!);
  act(() => vi.advanceTimersByTime(400));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
});

describe('shared host node hover integration', () => {
  it('uses the canonical info surface with resolved identity and only its dismiss action', () => {
    render(
      <SharedNodeHoverCard {...props}>
        <button type="button">Operation</button>
      </SharedNodeHoverCard>
    );
    expect(screen.queryByText(props.description)).toBeNull();
    openHover();
    expect(screen.getByText('Action · HTTP')).toBeInTheDocument();
    expect(screen.getByText(props.description)).toBeInTheDocument();
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByTestId('operation-icon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(props.description)).toBeNull();
  });

  it('never sends portalled info click or double-click to the canvas', () => {
    const click = vi.fn();
    const doubleClick = vi.fn();
    render(
      <div onClick={click} onDoubleClick={doubleClick}>
        <SharedNodeHoverCard {...props}>
          <button type="button">Operation</button>
        </SharedNodeHoverCard>
      </div>
    );
    openHover();
    fireEvent.click(screen.getByText(props.description));
    fireEvent.doubleClick(screen.getByText(props.description));
    expect(click).not.toHaveBeenCalled();
    expect(doubleClick).not.toHaveBeenCalled();
  });

  it('connects outer XYFlow focus, preserves existing descriptions and dismisses on Escape', () => {
    render(
      <div className="react-flow__node" tabIndex={0} aria-describedby="existing">
        <SharedNodeHoverCard {...props}>
          <button type="button">Operation</button>
        </SharedNodeHoverCard>
      </div>
    );
    const outer = document.querySelector<HTMLElement>('.react-flow__node')!;
    fireEvent.focusIn(outer);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText(props.description)).toBeInTheDocument();
    expect(outer.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
    fireEvent.keyDown(outer, { key: 'Escape' });
    expect(screen.queryByText(props.description)).toBeNull();
    expect(outer).toHaveAttribute('aria-describedby', 'existing');
  });

  it('suppresses and closes the info surface while selected, dragging or monitoring', () => {
    const { rerender } = render(
      <SharedNodeHoverCard {...props}>
        <button type="button">Operation</button>
      </SharedNodeHoverCard>
    );
    openHover();
    expect(screen.getByText(props.description)).toBeInTheDocument();
    rerender(
      <SharedNodeHoverCard {...props} disabled>
        <button type="button">Operation</button>
      </SharedNodeHoverCard>
    );
    expect(screen.queryByText(props.description)).toBeNull();
    openHover();
    expect(screen.queryByText(props.description)).toBeNull();
  });

  it('localizes categories, configured state and dismiss while preserving empty translations', () => {
    const intl = Intl.createIntl({
      locale: 'fr',
      defaultLocale: 'fr',
      fallbackOnEmptyString: false,
      messages: { arFQkD: 'Action locale', ekrQN7: 'Configuré', Jmqafh: 'Fermer' },
    });
    vi.spyOn(Intl, 'useIntl').mockReturnValue(intl);
    const { rerender } = render(
      <SharedNodeHoverCard {...props} subtitle="Action locale">
        <button type="button">Operation</button>
      </SharedNodeHoverCard>
    );
    openHover();
    expect(screen.getByText('Action locale')).toBeInTheDocument();
    expect(screen.queryByText('Action locale · Action locale')).toBeNull();
    expect(screen.getByText('Configuré')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    rerender(
      <SharedNodeHoverCard {...props} subtitle="" configured={false} description="">
        <button type="button">Operation</button>
      </SharedNodeHoverCard>
    );
    expect(screen.queryByText('HTTP')).toBeNull();
    expect(screen.queryByText('Configured')).toBeNull();
    expect(screen.queryByText(props.description)).toBeNull();
  });
});
