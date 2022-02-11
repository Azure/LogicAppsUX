import renderer from 'react-test-renderer';
import { CopyInputControl, CopyInputControlProps } from '..';

describe('ui/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;

  beforeEach(() => {
    minimal = {
      placeholder: 'URL goes here',
      text: 'http://test.com',
    };
  });

  it('should construct the copyinputcontrol correctly', () => {
    const tree = renderer.create(<CopyInputControl {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should set the aria-labelledby attribute', () => {
    const tree = renderer.create(<CopyInputControl {...minimal} ariaLabelledBy="aria-labelledby" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
