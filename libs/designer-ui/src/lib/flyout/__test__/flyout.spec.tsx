import renderer from 'react-test-renderer';
import { Flyout, FlyoutProps } from '../index';

describe('ui/flyout', () => {
  let minimal: FlyoutProps;

  beforeEach(() => {
    minimal = {
      text: 'text',
    };
  });

  it('should render', () => {
    const tree = renderer.create(<Flyout {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with an ARIA label', () => {
    const tree = renderer.create(<Flyout {...minimal} ariaLabel="aria-label" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a non-zero tab index', () => {
    const tree = renderer.create(<Flyout {...minimal} tabIndex={-1} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a title', () => {
    const tree = renderer.create(<Flyout {...minimal} title="title" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
