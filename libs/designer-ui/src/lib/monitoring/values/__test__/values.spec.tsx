import renderer from 'react-test-renderer';
import { Value } from '../index';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/value', () => {
  it('should render a body link value', () => {
    const props: ValueProps = {
      displayName: 'displayName',
      value: {
        contentHash: {
          algorithm: 'algorithm',
          value: 'value',
        },
        contentSize: 425,
        contentVersion: 'contentVersion',
        uri: 'uri',
      },
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a date-time value', () => {
    const props: ValueProps = {
      displayName: 'date/time',
      format: 'date-time',
      value: new Date(2017, 8, 1, 0, 0, 0, 0).toISOString(),
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a decimal value', () => {
    const props: ValueProps = {
      displayName: 'display-name',
      format: 'decimal',
      value: '-123.45',
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a HTML value', () => {
    const props: ValueProps = {
      displayName: 'date/time',
      format: 'html',
      value: '<table><tbody><tr><td>1</td></tr></tbody></table>',
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a key-value pairs details list', () => {
    const props: ValueProps = {
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Referrer-Policy': 'no-referred-when-downgrade',
      },
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a number value', () => {
    const props: ValueProps = {
      displayName: 'display-name',
      value: -123.45,
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a raw value', () => {
    const props: ValueProps = {
      displayName: 'raw',
      value: 'Hello World',
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render an XML value', () => {
    const props: ValueProps = {
      displayName: 'XML',
      value: {
        '$content-type': 'application/xml',
        $content: 'PHhtbD48L3htbD4=',
      },
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should not render when not visible', () => {
    const props: ValueProps = {
      displayName: 'raw',
      value: 'Hello World',
      visible: false,
    };
    const tree = renderer.create(<Value {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
