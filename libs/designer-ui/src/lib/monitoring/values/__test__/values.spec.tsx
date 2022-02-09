import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { Value } from '../index';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/value', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render a date-time value', () => {
    const props: ValueProps = {
      displayName: 'date/time',
      format: 'date-time',
      value: new Date(2017, 8, 1, 0, 0, 0, 0).toISOString(),
      visible: true,
    };
    renderer.render(<Value {...props} />);

    const value = renderer.getRenderOutput();
    expect(value.props).toEqual(props);
  });

  it('should render a HTML value', () => {
    const props: ValueProps = {
      displayName: 'date/time',
      format: 'html',
      value: '<table><tbody><tr><td>1</td></tr></tbody></table>',
      visible: true,
    };
    renderer.render(<Value {...props} />);

    const value = renderer.getRenderOutput();
    expect(value.props).toEqual(props);
  });

  it('should render a raw value', () => {
    const props: ValueProps = {
      displayName: 'raw',
      value: 'Hello World',
      visible: true,
    };
    renderer.render(<Value {...props} />);

    const value = renderer.getRenderOutput();
    expect(value.props).toEqual(props);
  });

  it('should render an XML value', () => {
    const props: ValueProps = {
      displayName: 'XML',
      value: {
        '$content-type': 'application/xml',
        $content: 'PHhtbD48L3htbD4=',
      },
      visible: true,
    };
    renderer.render(<Value {...props} />);

    const value = renderer.getRenderOutput();
    expect(value.props).toEqual(props);
  });
});
