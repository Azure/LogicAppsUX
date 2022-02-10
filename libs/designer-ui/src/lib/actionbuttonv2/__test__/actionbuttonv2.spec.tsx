import { createRef } from 'react';
import renderer from 'react-test-renderer';
import { ActionButtonV2, ActionButtonV2Props } from '../index';

describe('lib/actionbuttonv2', () => {
  let minimal: ActionButtonV2Props;

  beforeEach(() => {
    minimal = {
      title: 'title',
    };
  });

  it('should render', () => {
    const tree = renderer.create(<ActionButtonV2 {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a CSS class', () => {
    const tree = renderer.create(<ActionButtonV2 {...minimal} className="class-name" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render disabled', () => {
    const tree = renderer.create(<ActionButtonV2 {...minimal} disabled={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const tree = renderer.create(<ActionButtonV2 {...minimal} buttonRef={ref} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
