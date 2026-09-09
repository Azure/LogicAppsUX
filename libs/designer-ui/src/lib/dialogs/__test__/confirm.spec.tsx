/**
 * @vitest-environment jsdom
 */
import type { ConfirmProps } from '../confirm';
import { Confirm } from '../confirm';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { describe, vi, beforeEach, it, expect } from 'vitest';

describe('ui/dialogs/_confirm', () => {
  let minimal: ConfirmProps;

  beforeEach(() => {
    minimal = {
      hidden: false,
      message: 'Message',
      title: 'Title',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    };
  });

  const renderConfirm = (props: ConfirmProps) =>
    render(
      <IntlProvider locale="en">
        <Confirm {...props} />
      </IntlProvider>
    );

  it('should render', () => {
    const { baseElement } = renderConfirm(minimal);
    expect(baseElement).toMatchSnapshot();
  });

  it('should render the default confirm button label and call onConfirm', async () => {
    const user = userEvent.setup();

    renderConfirm(minimal);

    const confirmButton = screen.getByRole('button', { name: 'OK' });
    expect(confirmButton).toBeInTheDocument();

    await user.click(confirmButton);

    expect(minimal.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should render an override confirm button label and call onConfirm', async () => {
    const user = userEvent.setup();

    renderConfirm({ ...minimal, confirmText: 'Enable' });

    const confirmButton = screen.getByRole('button', { name: 'Enable' });
    expect(confirmButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();

    await user.click(confirmButton);

    expect(minimal.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when cancel is clicked', async () => {
    const user = userEvent.setup();

    renderConfirm(minimal);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(minimal.onDismiss).toHaveBeenCalledTimes(1);
  });
});
