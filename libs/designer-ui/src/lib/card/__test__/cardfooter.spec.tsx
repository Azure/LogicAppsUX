import renderer from 'react-test-renderer';
import { CardFooter, CardFooterProps } from '../cardfooter';
import { CommentBoxProps } from '../types';

describe('lib/card/errorbanner', () => {
  let minimal: CardFooterProps;

  beforeEach(() => {
    minimal = {};
  });

  it('should render', () => {
    const tree = renderer.create(<CardFooter {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a comment icon', () => {
    const commentBox: CommentBoxProps = {
      brandColor: '#474747',
      comment: 'comment',
      isDismissed: false,
      isEditing: false,
    };
    const tree = renderer.create(<CardFooter {...minimal} commentBox={commentBox} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a connection icon', () => {
    const tree = renderer
      .create(<CardFooter {...minimal} connectionDisplayName="joechung@microsoft.com" connectionRequired={true} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with an inactive connection icon', () => {
    const tree = renderer.create(<CardFooter {...minimal} connectionDisplayName="" connectionRequired={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a testing icon', () => {
    const tree = renderer.create(<CardFooter {...minimal} staticResultsEnabled={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
