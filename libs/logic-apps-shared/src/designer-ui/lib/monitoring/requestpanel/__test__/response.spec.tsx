import type { ResponseProps } from '../response';
import { Response } from '../response';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('lib/monitoring/requestpanel/response', () => {
  let minimal: ResponseProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      response: {
        headers: {},
        statusCode: 200,
      },
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Response {...minimal} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe('msla-trace-inputs-outputs');

    const [headerContainer, values]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(values.props.className).toBe('msla-trace-values');

    const header = React.Children.only(headerContainer.props.children);
    expect(header.props.children).toBe('Response');

    const [statusCode, headers, body, bodyLink]: any[] = React.Children.toArray(values.props.children);
    expect(statusCode.props).toEqual({
      displayName: 'Status code',
      value: minimal.response?.statusCode,
    });
    expect(headers.props).toEqual({
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: minimal.response?.headers,
    });
    expect(body.props).toEqual({
      displayName: 'Body',
      value: minimal.response?.body,
      visible: false,
    });
    expect(bodyLink.props).toEqual({
      displayName: 'Body',
      value: minimal.response?.bodyLink,
      visible: false,
    });
  });

  it('should not render when not visible', () => {
    renderer.render(<Response response={undefined} />);

    const section = renderer.getRenderOutput();
    expect(section).toBeNull();
  });
});
