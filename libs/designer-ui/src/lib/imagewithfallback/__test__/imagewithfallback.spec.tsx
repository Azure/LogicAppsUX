import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { ImageWithFallback, ImageWithFallbackProps } from '..';

describe('ui/imagewithfallback', () => {
  let minimal: ImageWithFallbackProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      src: '../../card/images/comment.svg',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<ImageWithFallback {...minimal} />);

    const image = renderer.getRenderOutput();
    expect(image.props.onError).toBeDefined();
    expect(image.props.src).toBe(minimal.src);
  });

  it('should render the default fallback image', () => {
    renderer.render(<ImageWithFallback {...minimal} />);

    const attr = jest.fn();
    const image = renderer.getRenderOutput();
    const e = {
      currentTarget: {
        setAttribute: attr,
      },
    };
    image.props.onError(e as any); // tslint:disable-line: no-any

    expect(e.currentTarget.setAttribute).toHaveBeenCalledWith('src', 'defaulticon.svg');
  });

  it('should render the specified fallback image', () => {
    const fallback = 'fallback.svg';
    renderer.render(<ImageWithFallback {...minimal} fallback={fallback} />);

    const image = renderer.getRenderOutput();
    const e = {
      currentTarget: {
        setAttribute: jest.fn(),
      },
    };
    image.props.onError(e as any); // tslint:disable-line: no-any

    expect(e.currentTarget.setAttribute).toHaveBeenCalledWith('src', fallback);
  });
});
