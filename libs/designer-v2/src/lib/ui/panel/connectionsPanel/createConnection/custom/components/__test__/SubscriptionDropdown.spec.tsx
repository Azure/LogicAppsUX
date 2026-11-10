/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionDropdown } from '../SubscriptionDropdown';

let comboBoxProps: any;
const focus = vi.fn();

vi.mock('@fluentui/react', () => ({
  ComboBox: (props: any) => {
    comboBoxProps = props;
    props.componentRef.current = { focus };
    return <div data-testid="subscription-combobox">{props.children}</div>;
  },
  Spinner: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock('../../../connectionParameterRow', () => ({
  ConnectionParameterRow: ({ children, displayName }: any) => (
    <div>
      <span>{displayName}</span>
      {children}
    </div>
  ),
}));

vi.mock('../../styles', () => ({
  useStyles: () => ({ subscriptionCombobox: 'subscription-combobox' }),
}));

describe('SubscriptionDropdown', () => {
  const setSelectedSubscriptionId = vi.fn();
  const subscriptions = [
    { id: '/subscriptions/sub-b', displayName: 'Zulu' },
    { id: '/subscriptions/sub-a', displayName: 'Alpha' },
  ] as any;

  const renderDropdown = (overrides = {}) =>
    render(
      <IntlProvider locale="en">
        <SubscriptionDropdown
          subscriptions={subscriptions}
          selectedSubscriptionId="sub-a"
          setSelectedSubscriptionId={setSelectedSubscriptionId}
          title="Select subscription"
          {...overrides}
        />
      </IntlProvider>
    );

  beforeEach(() => {
    comboBoxProps = undefined;
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('sorts subscriptions, extracts ARM IDs, and displays the selected option', () => {
    renderDropdown();

    expect(comboBoxProps.options).toEqual([
      { key: 'sub-a', text: 'Alpha (sub-a)' },
      { key: 'sub-b', text: 'Zulu (sub-b)' },
    ]);
    expect(comboBoxProps.selectedKey).toBe('sub-a');
    expect(comboBoxProps.text).toBe('Alpha (sub-a)');
  });

  it('selects an option and updates pending freeform text', () => {
    renderDropdown();

    act(() => comboBoxProps.onChange(undefined, { key: 'sub-b', text: 'Zulu (sub-b)' }));
    expect(setSelectedSubscriptionId).toHaveBeenCalledWith('sub-b');
    expect(comboBoxProps.text).toBe('Zulu (sub-b)');

    act(() => comboBoxProps.onPendingValueChanged(undefined, undefined, 'search'));
    expect(comboBoxProps.text).toBe('search');
  });

  it('uses an unselected key when the subscription ID is empty', () => {
    renderDropdown({ selectedSubscriptionId: '' });
    expect(comboBoxProps.selectedKey).toBeNull();
  });

  it('handles absent subscriptions and selections without a matching option', () => {
    const { rerender } = renderDropdown({ subscriptions: undefined, selectedSubscriptionId: 'missing' });

    expect(comboBoxProps.options).toEqual([]);
    expect(comboBoxProps.text).toBe('');

    rerender(
      <IntlProvider locale="en">
        <SubscriptionDropdown
          subscriptions={subscriptions}
          selectedSubscriptionId="missing"
          setSelectedSubscriptionId={setSelectedSubscriptionId}
          title="Select subscription"
        />
      </IntlProvider>
    );
    expect(comboBoxProps.text).toBe('');

    act(() => comboBoxProps.onChange(undefined, undefined));
    expect(setSelectedSubscriptionId).not.toHaveBeenCalled();

    act(() => comboBoxProps.onPendingValueChanged(undefined, undefined, undefined));
    expect(comboBoxProps.text).toBe('');
  });

  it('shows and disables loading state', () => {
    renderDropdown({ isFetchingSubscriptions: true });

    expect(comboBoxProps.disabled).toBe(true);
    expect(comboBoxProps.placeholder).toBe('Loading all subscriptions...');
    expect(screen.getByText('Loading all subscriptions...')).toBeInTheDocument();
  });

  it('focuses the combobox only when it is not loading', () => {
    const { rerender } = renderDropdown();
    comboBoxProps.onClick();
    expect(focus).toHaveBeenCalledWith(true);

    rerender(
      <IntlProvider locale="en">
        <SubscriptionDropdown
          subscriptions={subscriptions}
          isFetchingSubscriptions={true}
          selectedSubscriptionId="sub-a"
          setSelectedSubscriptionId={setSelectedSubscriptionId}
          title="Select subscription"
        />
      </IntlProvider>
    );
    comboBoxProps.onClick();
    expect(focus).toHaveBeenCalledOnce();
  });
});
