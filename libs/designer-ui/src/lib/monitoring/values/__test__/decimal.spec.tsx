import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { getTestIntl } from '../../../__test__/intl-test-helper';
import { DecimalValue } from '../decimal';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/decimal', () => {
  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: '-123.45',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<DecimalValue {...props} />);

    const value = renderer.getRenderOutput();

    const intl = getTestIntl();
    const expected = intl.formatNumber(props.value);
    expect(value.props.value).toBe(expected);
  });

  it('should render decimals without minus signs', () => {
    props.value = '123.45';
    renderer.render(<DecimalValue {...props} />);

    const value = renderer.getRenderOutput();

    const intl = getTestIntl();
    const expected = intl.formatNumber(props.value);
    expect(value.props.value).toBe(expected);
  });

  it('should render decimals without decimal points', () => {
    props.value = '-123';
    renderer.render(<DecimalValue {...props} />);

    const value = renderer.getRenderOutput();

    const intl = getTestIntl();
    const expected = intl.formatNumber(props.value);
    expect(value.props.value).toBe(expected);
  });
});
