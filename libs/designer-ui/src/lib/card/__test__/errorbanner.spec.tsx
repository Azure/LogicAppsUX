import { MessageBarType, setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';
import { ErrorBanner, ErrorBannerProps } from '../errorbanner';

describe('lib/card/errorbanner', () => {
  let minimal: ErrorBannerProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      errorLevel: MessageBarType.severeWarning,
      errorMessage: 'errorMessage',
    };
  });

  it('should render', () => {
    const tree = renderer.create(<ErrorBanner {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('hidden', () => {
    let renderer: ShallowRenderer.ShallowRenderer;

    beforeEach(() => {
      renderer = ShallowRenderer.createRenderer();
    });

    afterEach(() => {
      renderer.unmount();
    });

    it('should not render when no error level is set', () => {
      renderer.render(<ErrorBanner {...minimal} errorLevel={undefined} />);
      const banner = renderer.getRenderOutput();
      expect(banner).toBeNull();
    });

    it('should not render when no error message is set', () => {
      renderer.render(<ErrorBanner {...minimal} errorMessage="" />);
      const banner = renderer.getRenderOutput();
      expect(banner).toBeNull();
    });
  });
});
