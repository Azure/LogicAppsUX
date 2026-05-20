/**
 * @vitest-environment jsdom
 */
import type { ConfirmProps } from '../confirm';
import { Confirm } from '../confirm';
import * as React from 'react';
import { render } from '@testing-library/react';
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

  it('should render', () => {
    const { baseElement } = render(
      <IntlProvider locale="en">
        <Confirm {...minimal} />
      </IntlProvider>
    );
    expect(baseElement).toMatchSnapshot();
  });
});
