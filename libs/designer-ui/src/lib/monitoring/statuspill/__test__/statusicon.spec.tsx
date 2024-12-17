import renderer from 'react-test-renderer';
import { StatusIcon } from '../statusicon';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { IntlProvider } from 'react-intl';

describe('lib/monitoring/statuspill/statusicon', () => {
  for (const { hasRetries, status } of [
    { hasRetries: false, status: 'Aborted' },
    { hasRetries: false, status: 'Cancelled' },
    { hasRetries: false, status: 'Failed' },
    { hasRetries: false, status: 'Running' },
    { hasRetries: false, status: 'Skipped' },
    { hasRetries: false, status: 'Succeeded' },
    { hasRetries: true, status: 'Succeeded' },
    { hasRetries: false, status: 'TimedOut' },
    { hasRetries: false, status: 'Unknown' },
    { hasRetries: false, status: 'Waiting' },
  ]) {
    it(`renders (status = ${status}, has retries = ${hasRetries})`, () => {
      const iconComponent = (
        <IntlProvider locale="en">
          <StatusIcon hasRetries={hasRetries} status={status} />
        </IntlProvider>
      );
      const icon = renderer.create(iconComponent).toJSON();
      expect(icon).toMatchSnapshot();
    });
  }
});
