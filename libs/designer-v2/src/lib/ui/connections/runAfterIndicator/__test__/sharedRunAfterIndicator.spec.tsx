import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { SharedCollapsedRunAfterIndicator, SharedRunAfterIndicator, toSharedRunAfterStatuses } from '../SharedRunAfterIndicator';

const renderWithIntl = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" defaultLocale="en" onError={() => undefined}>
      {ui}
    </IntlProvider>
  );

describe('toSharedRunAfterStatuses', () => {
  it('maps workflow statuses case-insensitively, de-duplicates, and drops unknown values', () => {
    expect(toSharedRunAfterStatuses(['Succeeded', 'TIMEDOUT', 'skipped', 'Failed', 'FAILED', 'Cancelled'])).toEqual([
      'succeeded',
      'timedOut',
      'skipped',
      'failed',
    ]);
    expect(toSharedRunAfterStatuses([])).toEqual([]);
  });
});

describe('SharedRunAfterIndicator', () => {
  it.each([false, true])('keeps the named tooltip trigger keyboard-accessible and isolated (collapsed=%s)', async (collapsed) => {
    const click = vi.fn();
    const pointerDown = vi.fn();
    renderWithIntl(
      <div onClick={click} onPointerDown={pointerDown}>
        {collapsed ? (
          <SharedCollapsedRunAfterIndicator filteredRunAfters={{ Http_call: ['Failed'] }} runAfterCount={6} />
        ) : (
          <SharedRunAfterIndicator statuses={['Failed']} sourceNodeId="Http_call" />
        )}
      </div>
    );
    const indicator = screen.getByRole('img', { name: collapsed ? 'Runs after 6 actions' : 'Runs after: Has failed' });
    expect(indicator).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => indicator.focus());
    expect(indicator).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Run after Http call');
    for (const target of [indicator, indicator.firstElementChild!]) {
      fireEvent.click(target);
      fireEvent.pointerDown(target);
    }
    expect(click).not.toHaveBeenCalled();
    expect(pointerDown).not.toHaveBeenCalled();
  });
  it('fills only the configured statuses and names them with the legacy status strings', () => {
    renderWithIntl(<SharedRunAfterIndicator statuses={['Failed', 'Skipped', 'Unknown']} sourceNodeId="Http_call" />);
    const indicator = screen.getByRole('img', { name: 'Runs after: Is skipped, Has failed' });
    const filled = Array.from(indicator.querySelectorAll('[data-filled]')).map((dot) => dot.getAttribute('data-run-after-status'));
    expect(filled).toEqual(['skipped', 'failed']);
    expect(indicator.querySelectorAll('[data-run-after-status]')).toHaveLength(4);
  });

  it('renders all hollow dots with an empty summary when no known statuses are configured', () => {
    renderWithIntl(<SharedRunAfterIndicator statuses={['Cancelled']} sourceNodeId="Http_call" />);
    const indicator = screen.getByRole('img', { name: /^Runs after:\s*$/ });
    expect(indicator.querySelectorAll('[data-filled]')).toHaveLength(0);
  });
});

describe('SharedCollapsedRunAfterIndicator', () => {
  it('renders the collapsed count for more than five sources', () => {
    const filteredRunAfters = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`source_${index}`, ['Failed']]));
    renderWithIntl(<SharedCollapsedRunAfterIndicator filteredRunAfters={filteredRunAfters} runAfterCount={6} />);
    const indicator = screen.getByRole('img', { name: 'Runs after 6 actions' });
    expect(indicator).toHaveAttribute('data-run-after', 'collapsed');
    expect(indicator).toHaveTextContent('×6');
  });
});
