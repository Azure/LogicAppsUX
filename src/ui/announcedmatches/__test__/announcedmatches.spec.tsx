import * as React from 'react';

import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { AnnouncedMatches, AnnouncedMatchesProps } from '..';

describe('ui/announcedmatches', () => {
  let minimal: AnnouncedMatchesProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      count: 0,
      visible: false,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should not render when not visible', () => {
    renderer.render(<AnnouncedMatches {...minimal} />);

    const announced = renderer.getRenderOutput();
    expect(announced).toBeNull();
  });

  it('should render when visible', () => {
    renderer.render(<AnnouncedMatches {...minimal} visible={true} />);

    const announced = renderer.getRenderOutput();
    expect(announced.props.message).toBe(`no items matched.`);
  });

  it('should render a loading message when loading', () => {
    renderer.render(<AnnouncedMatches {...minimal} isLoading={true} visible={true} />);

    const announced = renderer.getRenderOutput();
    expect(announced.props.message).toBe('Loading...');
  });

  it('should render with singular text when count is 1', () => {
    renderer.render(<AnnouncedMatches {...minimal} count={1} visible={true} />);

    const announced = renderer.getRenderOutput();
    expect(announced.props.message).toBe('1 item matched.');
  });

  it('should render with plural text when count is greater than 1', () => {
    renderer.render(<AnnouncedMatches {...minimal} count={2} visible={true} />);

    const announced = renderer.getRenderOutput();
    expect(announced.props.message).toBe('2 items matched.');
  });
});
