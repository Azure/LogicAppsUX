import type { CopyInputControlProps } from '..';
import { CopyInputControl } from '..';
import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';

describe('lib/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

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
