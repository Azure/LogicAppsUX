import React from 'react';
import type { AboutProps } from '../';
import { About } from '../';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/monitoring/requestpanel/request', () => {
  let minimal: AboutProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {};
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const tree = renderer.render(<About {...minimal} />);
    expect(tree).toMatchSnapshot();
  });

  it('should render a body', () => {
    const props = {
      ...minimal,
      connectorDisplayName: 'test',
      description: 'This is a description ',
      headerIcons: [
        { title: 'Tag1', badgeText: 'test' },
        { title: 'Tag2', badgeText: 'more' },
      ],
    };

    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });

  it('should render a description with external link', () => {
    const props = {
      ...minimal,
      connectorDisplayName: 'test',
      description: 'This is a description ',
      descriptionDocumentation: { url: 'www.microsoft.com', description: 'more info' },
      headerIcons: [
        { title: 'Tag1', badgeText: 'test' },
        { title: 'Tag2', badgeText: 'more' },
      ],
    };

    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly with different connectorDisplayName values', () => {
    const props = {
      ...minimal,
      connectorDisplayName: 'new test',
    };
    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });

  test('renders correctly with different headerIcons values', () => {
    const props = {
      ...minimal,
      headerIcons: [
        { title: 'NewTag1', badgeText: 'new test' },
        { title: 'NewTag2', badgeText: 'new more' },
      ],
    };
    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });

  test('renders correctly when descriptionDocumentation is undefined', () => {
    const props = {
      ...minimal,
      descriptionDocumentation: undefined,
    };
    const tree = renderer.render(<About {...props} />);
    expect(tree).toMatchSnapshot();
  });
});
