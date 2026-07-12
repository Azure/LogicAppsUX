import { SimpleDictionary } from '../dictionary/simpledictionary';
import { IntlProvider } from 'react-intl';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const renderWithIntl = (ui: ReactElement) => render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('ui/settings/simpledictionary', () => {
  it('keeps the editor in sync when the incoming dictionary value changes', async () => {
    const onChange = vi.fn();

    const { rerender } = renderWithIntl(<SimpleDictionary value={{ ClientId: 'first-value' }} onChange={onChange} />);

    await waitFor(() => expect(screen.getByDisplayValue('first-value')).toBeInTheDocument());

    rerender(
      <IntlProvider locale="en">
        <SimpleDictionary value={{ ClientId: 'second-value' }} onChange={onChange} />
      </IntlProvider>
    );

    await waitFor(() => expect(screen.getByDisplayValue('second-value')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('first-value')).not.toBeInTheDocument();
  });
});
