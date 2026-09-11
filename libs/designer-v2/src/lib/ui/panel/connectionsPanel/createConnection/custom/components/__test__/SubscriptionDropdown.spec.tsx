/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { SubscriptionDropdown } from '../SubscriptionDropdown';

let comboProps: any;
vi.mock('@fluentui/react', () => ({
  ComboBox: (props: any) => {
    comboProps = props;
    return <div data-testid="combobox">{props.children}</div>;
  },
  Spinner: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('../../../connectionParameterRow', () => ({
  ConnectionParameterRow: ({ children, displayName }: any) => (
    <label>
      {displayName}
      {children}
    </label>
  ),
}));
vi.mock('../../styles', () => ({ useStyles: () => ({ subscriptionCombobox: 'subscription' }) }));

describe('SubscriptionDropdown', () => {
  beforeEach(() => {
    comboProps = undefined;
  });
  afterEach(cleanup);

  const renderDropdown = (overrides = {}) =>
    render(
      <IntlProvider locale="en">
        <SubscriptionDropdown
          subscriptions={
            [
              { id: '/subscriptions/b', displayName: 'Zulu' },
              { id: '/subscriptions/a', displayName: 'Alpha' },
            ] as any
          }
          selectedSubscriptionId="a"
          setSelectedSubscriptionId={vi.fn()}
          title="Select subscription"
          {...overrides}
        />
      </IntlProvider>
    );

  it('sorts subscriptions, extracts IDs, and displays the selected subscription', () => {
    renderDropdown();

    expect(comboProps.options).toEqual([
      { key: 'a', text: 'Alpha (a)' },
      { key: 'b', text: 'Zulu (b)' },
    ]);
    expect(comboProps.selectedKey).toBe('a');
    expect(comboProps.text).toBe('Alpha (a)');
  });

  it('updates the selected subscription and pending input text', () => {
    const setSelectedSubscriptionId = vi.fn();
    renderDropdown({ setSelectedSubscriptionId });

    act(() => comboProps.onChange(undefined, { key: 'b', text: 'Zulu (b)' }));
    expect(setSelectedSubscriptionId).toHaveBeenCalledWith('b');
    expect(comboProps.text).toBe('Zulu (b)');

    act(() => comboProps.onPendingValueChanged(undefined, undefined, 'search'));
    expect(comboProps.text).toBe('search');
  });

  it('disables the combobox and shows loading content while fetching', () => {
    renderDropdown({ isFetchingSubscriptions: true });

    expect(comboProps.disabled).toBe(true);
    expect(comboProps.placeholder).toBe('Loading all subscriptions...');
    expect(screen.getByText('Loading all subscriptions...')).toBeInTheDocument();
  });
});
