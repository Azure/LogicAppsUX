import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { StatusPill, StatusPillProps } from '../';

describe('/ui/monitoring/statuspill/_statuspill', () => {
  const classNames = {
    pill: 'msla-pill',
    pillInner: 'msla-pill--inner',
    statusOnly: 'status-only',
  };

  let minimal: StatusPillProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      status: 'Succeeded',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<StatusPill {...minimal} />);

    const pill = renderer.getRenderOutput();
    expect(pill.props['aria-label']).toBe('Succeeded');
    expect(pill.props.className).toContain(classNames.pill);
    expect(pill.props.className).toContain(classNames.statusOnly);

    const tooltipHost = React.Children.only(pill.props.children);
    expect(tooltipHost.props.content).toBe('Succeeded');

    const inner = React.Children.only(tooltipHost.props.children);
    expect(inner.props.className).toBe(classNames.pillInner);

    const image = React.Children.only(inner.props.children);
    expect(image.props.status).toBe('Succeeded');
  });

  it('should render the duration as text and as an ARIA label', () => {
    renderer.render(<StatusPill {...minimal} duration="1s" durationAnnounced="1 second" />);

    const pill = renderer.getRenderOutput();
    expect(pill.props['aria-label']).toBe(`1 second. ${'Succeeded'}`);
    expect(pill.props.className).toContain(classNames.pill);

    const tooltipHost = React.Children.only(pill.props.children);
    expect(tooltipHost.props.content).toBe(`1 second. ${'Succeeded'}`);

    const inner = React.Children.only(tooltipHost.props.children);
    expect(inner.props.className).toBe(classNames.pillInner);

    const [duration, image] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    expect(duration.props['aria-hidden']).toBeTruthy();
    expect(duration.props.children).toBe('1s');
    expect(image.props.status).toBe(minimal.status);
  });
});
