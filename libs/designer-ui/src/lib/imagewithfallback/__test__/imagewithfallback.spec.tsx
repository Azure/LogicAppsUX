import type { ImageWithFallbackProps } from '..';
import { ImageWithFallback } from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
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

    const attr = vi.fn();
    const image = renderer.getRenderOutput();
    const e = {
      currentTarget: {
        setAttribute: attr,
      },
    };
    image.props.onError(e as any);

    expect(e.currentTarget.setAttribute).toHaveBeenCalled();
    const callArgs = e.currentTarget.setAttribute.mock.calls[0];
    expect(callArgs[0]).toBe('src');
    expect(callArgs[1]).toMatch(/^data:image\/svg\+xml/);
  });

  it('should render the specified fallback image', () => {
    const fallback = 'fallback.svg';
    renderer.render(<ImageWithFallback {...minimal} fallback={fallback} />);

    const image = renderer.getRenderOutput();
    const e = {
      currentTarget: {
        setAttribute: vi.fn(),
      },
    };
    image.props.onError(e as any);

    expect(e.currentTarget.setAttribute).toHaveBeenCalledWith('src', fallback);
  });
});
