import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';
import { Request, RequestProps } from '../request';

describe('lib/monitoring/requestpanel/request', () => {
  let minimal: RequestProps;

  beforeEach(() => {
    minimal = {
      request: {
        headers: {},
        method: 'GET',
        uri: 'https://httpbin.org/get',
      },
    };
  });

  it('should render', () => {
    const tree = renderer.create(<Request {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a body', () => {
    const props = {
      ...minimal,
      request: {
        body: {
          hello: 'world!',
        },
        headers: {},
        method: 'POST',
        uri: 'https://httpbin.org/post',
      },
    };

    const tree = renderer.create(<Request {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a body link', () => {
    const props = {
      ...minimal,
      request: {
        bodyLink: {
          contentHash: {
            algorithm: 'md5',
            value: '[REDACTED]',
          },
          contentSize: 512,
          contentVersion: '1',
          uri: '[REDACTED]',
        },
        headers: {},
        method: 'POST',
        uri: 'https://httpbin.org/post',
      },
    };

    const tree = renderer.create(<Request {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('visible', () => {
    let renderer: ShallowRenderer.ShallowRenderer;

    beforeEach(() => {
      renderer = ShallowRenderer.createRenderer();
    });

    afterEach(() => {
      renderer.unmount();
    });

    it('should not render when there is no request', () => {
      renderer.render(<Request request={undefined} />);

      const section = renderer.getRenderOutput();
      expect(section).toBeNull();
    });
  });
});
