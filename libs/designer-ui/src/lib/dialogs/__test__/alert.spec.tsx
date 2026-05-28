/**
 * @vitest-environment jsdom
 */
import type { AlertProps } from '../alert';
import { Alert } from '../alert';
import * as React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, beforeEach, it, expect } from 'vitest';

describe('ui/dialogs/_alert', () => {
  let minimal: AlertProps;

  beforeEach(() => {
    minimal = {
      hidden: false,
      message: 'Message',
      title: 'Title',
      onDismiss: vi.fn(),
    };
  });

  it('should render', () => {
    const { baseElement } = render(
      <IntlProvider locale="en">
        <Alert {...minimal} />
      </IntlProvider>
    );
    expect(baseElement).toMatchSnapshot();
  });
});
