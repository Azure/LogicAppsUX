import type { ImageWithFallbackProps } from '..';
import { ImageWithFallback } from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
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

    expect(e.currentTarget.setAttribute).toHaveBeenCalledWith('src', '/src/lib/documentationlinkitem/images/defaulticon.svg');
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
