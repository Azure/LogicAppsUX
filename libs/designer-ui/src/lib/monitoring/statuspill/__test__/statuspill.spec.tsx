import type { StatusPillProps } from '../index';
import { StatusPill } from '../index';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/monitoring/statuspill', () => {
  // Note: Class names have been migrated to makeStyles and are no longer static strings
  // We'll focus on testing functionality rather than specific CSS classes

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
    expect(pill.props.className).toBeDefined(); // Class names are now dynamic

    const tooltipHost = React.Children.only(pill.props.children);
    expect(tooltipHost.props.content).toBe('Succeeded');

    const inner = React.Children.only(tooltipHost.props.children);
    expect(inner.props.className).toBeDefined(); // Class names are now dynamic

    const image = React.Children.toArray(inner.props.children)[0] as any;
    expect(image.props.status).toBe('Succeeded');
  });

  it('should render the duration as text and as an ARIA label', () => {
    renderer.render(<StatusPill {...minimal} duration="1s" startTime="4/28/2023, 12:06:28 AM" endTime="4/28/2023, 12:06:29 AM" />);

    const pill = renderer.getRenderOutput();
    expect(pill.props['aria-label']).toBe(`1 second. ${'Succeeded'}`);
    expect(pill.props.className).toBeDefined(); // Class names are now dynamic

    const tooltipHost = React.Children.only(pill.props.children);
    expect(tooltipHost.props.content).toBe(`1 second. ${'Succeeded'}`);

    const inner = React.Children.only(tooltipHost.props.children);
    expect(inner.props.className).toBeDefined(); // Class names are now dynamic

    const [duration, image]: any[] = React.Children.toArray(inner.props.children);
    expect(duration.props['aria-hidden']).toBeTruthy();
    expect(duration.props.children).toBe('1s');
    expect(image.props.status).toBe(minimal.status);
  });
});
