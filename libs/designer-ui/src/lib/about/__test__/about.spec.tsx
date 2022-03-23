import type { AboutProps } from '../';
import { About } from '../';
import renderer from 'react-test-renderer';

describe('lib/monitoring/requestpanel/request', () => {
  let minimal: AboutProps;

  beforeEach(() => {
    minimal = {};
  });

  it('should render', () => {
    const tree = renderer.create(<About {...minimal} />).toJSON();
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

    const tree = renderer.create(<About {...props} />).toJSON();
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

    const tree = renderer.create(<About {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
