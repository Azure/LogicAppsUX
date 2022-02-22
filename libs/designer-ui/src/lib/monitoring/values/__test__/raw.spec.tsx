import renderer from 'react-test-renderer';
import { RawValue } from '../raw';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/_raw', () => {
  let props: ValueProps;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: 'value',
    };
  });

  it('should render', () => {
    const tree = renderer.create(<RawValue {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should rendered a zero-width space if value is empty', () => {
    const tree = renderer.create(<RawValue {...props} value="" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should not render when not visible', () => {
    const tree = renderer.create(<RawValue {...props} visible={false} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
