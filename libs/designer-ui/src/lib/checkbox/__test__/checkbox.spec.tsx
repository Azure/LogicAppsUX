import renderer from 'react-test-renderer';
import { Checkbox } from '../index';

describe('lib/checkbox', () => {
  it('should render', () => {
    const tree = renderer.create(<Checkbox />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should display correct text', () => {
    const tree = renderer.create(<Checkbox text="Test Text" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render an additional CSS class', () => {
    const tree = renderer.create(<Checkbox className="additional-class" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with initial checked state set to true', () => {
    const tree = renderer.create(<Checkbox className="additional-class" initialChecked={true} />);
    expect(tree).toMatchSnapshot();
  });

  it('should render an info button if description text is set', () => {
    const tree = renderer.create(<Checkbox descriptionText="Description text" />);
    expect(tree).toMatchSnapshot();
  });
});
