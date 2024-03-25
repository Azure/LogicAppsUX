import type { RequestPanelProps } from '../index';
import { RequestPanel } from '../index';
import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('lib/monitoring/requestpanel', () => {
  let minimal: RequestPanelProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      requestHistory: [
        {
          properties: {
            endTime: '2022-02-09T13:53:00Z',
            startTime: '2022-02-09T13:52:00Z',
          },
        },
      ],
    };
  });

  it('should render', () => {
    const tree = renderer.create(<RequestPanel {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a request', () => {
    const props = {
      ...minimal,
      requestHistory: [
        {
          properties: {
            ...minimal.requestHistory[0].properties,
            request: {
              headers: {},
              method: 'GET',
              uri: 'https://httpbin.org/get',
            },
          },
        },
      ],
    };

    const tree = renderer.create(<RequestPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a secured request', () => {
    const props = {
      ...minimal,
      requestHistory: [
        {
          properties: {
            ...minimal.requestHistory[0].properties,
            request: {
              headers: {},
              method: 'GET',
              url: 'https://httpbin.org/get',
            },
            secureData: {
              properties: ['request'],
            },
          },
        },
      ],
    };

    const tree = renderer.create(<RequestPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a response', () => {
    const props = {
      ...minimal,
      requestHistory: [
        {
          properties: {
            ...minimal.requestHistory[0].properties,
            response: {
              body: {},
              headers: {},
              statusCode: 200,
            },
          },
        },
      ],
    };

    const tree = renderer.create(<RequestPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a secured response', () => {
    const props = {
      ...minimal,
      requestHistory: [
        {
          properties: {
            ...minimal.requestHistory[0].properties,
            response: {
              body: {},
              headers: {},
              statusCode: 200,
            },
            secureData: {
              properties: ['response'],
            },
          },
        },
      ],
    };

    const tree = renderer.create(<RequestPanel {...props} />).toJSON();
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

    it('should not render when not visible', () => {
      renderer.render(<RequestPanel {...minimal} visible={false} />);

      const section = renderer.getRenderOutput();
      expect(section).toBeNull();
    });
  });
});
