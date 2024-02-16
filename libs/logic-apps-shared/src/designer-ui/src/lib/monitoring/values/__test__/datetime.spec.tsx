import * as React from 'react';
import type { FormatDateOptions } from 'react-intl';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { getTestIntl } from '../../../__test__/intl-test-helper';
import { DateTimeValue } from '../datetime';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/datetime', () => {
  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: new Date(2017, 8, 1, 0, 0, 0, 0).toISOString(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const options: FormatDateOptions = {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: 'numeric',
      month: 'numeric',
      second: 'numeric',
      timeZone: 'UTC',
      year: 'numeric',
    };

    renderer.render(<DateTimeValue {...props} />);

    const value = renderer.getRenderOutput();
    expect(value.props.displayName).toBe(props.displayName);

    const intl = getTestIntl();
    const expected = intl.formatDate(props.value, options);
    expect(value.props.value).toBe(expected);
  });
});
