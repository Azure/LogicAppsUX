import type { AboutProps } from '../';
import { About } from '../';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('lib/monitoring/requestpanel/request', () => {
  let minimal: AboutProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {};
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const tree = renderer.render(<About {...minimal} />);
    expect(tree).toMatchSnapshot();
  });

  it('should render a body', () => {
    const props = {
      ...minimal,
      connectorDisplayName: 'test',
      description: 'This is a description ',
      headerIcons: [
        { title: 'Tag1', badgeText: 'test' },
        { title: 'Tag2', badgeText: 'more' },
      ],
    };

    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });

  it('should render a description with external link', () => {
    const props = {
      ...minimal,
      connectorDisplayName: 'test',
      description: 'This is a description ',
      descriptionDocumentation: { url: 'www.microsoft.com', description: 'more info' },
      headerIcons: [
        { title: 'Tag1', badgeText: 'test' },
        { title: 'Tag2', badgeText: 'more' },
      ],
    };

    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });
});
