import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { getTestIntl } from '../../../__test__/intl-test-helper';
import { NumberValue } from '../number';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/number', () => {
  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: -123.45,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<NumberValue {...props} />);

    const value = renderer.getRenderOutput();

    const intl = getTestIntl();
    const expected = intl.formatNumber(props.value);
    expect(value.props.value).toBe(expected);
  });
});
