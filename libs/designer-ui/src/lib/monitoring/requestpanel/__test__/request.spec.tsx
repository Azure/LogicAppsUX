import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { Request, RequestProps } from '../request';

describe('lib/monitoring/requestpanel/request', () => {
  let minimal: RequestProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      request: {
        headers: {},
        method: 'GET',
        uri: 'https://httpbin.org/get',
      },
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Request {...minimal} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe('msla-trace-inputs-outputs');

    const [headerContainer, values]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(values.props.className).toBe('msla-trace-values');

    const header = React.Children.only(headerContainer.props.children);
    expect(header.props.children).toBe('Request');

    const [method, uri, headers, body, bodyLink]: any[] = React.Children.toArray(values.props.children);
    expect(method.props).toEqual({
      displayName: 'Method',
      value: minimal?.request?.method,
    });
    expect(uri.props).toEqual({
      displayName: 'URI',
      value: minimal?.request?.uri,
    });
    expect(headers.props).toEqual({
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: minimal?.request?.headers,
    });
    expect(body.props).toEqual(
      expect.objectContaining({
        visible: false,
      })
    );
    expect(bodyLink.props).toEqual(
      expect.objectContaining({
        visible: false,
      })
    );
  });

  it('should render a body', () => {
    minimal.request = {
      body: {
        hello: 'world!',
      },
      headers: {},
      method: 'POST',
      uri: 'https://httpbin.org/post',
    };
    renderer.render(<Request {...minimal} />);

    const section = renderer.getRenderOutput();
    const [, values]: any[] = React.Children.toArray(section.props.children);
    const [, , , body]: any[] = React.Children.toArray(values.props.children);
    expect(body.props).toEqual({
      displayName: 'Body',
      value: minimal?.request?.body,
      visible: true,
    });
  });

  it('should render a body link', () => {
    minimal.request = {
      bodyLink: {
        contentHash: {
          algorithm: 'md5',
          value: '[REDACTED]',
        },
        contentSize: 512,
        contentVersion: '1',
        uri: '[REDACTED]',
      },
      headers: {},
      method: 'POST',
      uri: 'https://httpbin.org/post',
    };
    renderer.render(<Request {...minimal} />);

    const section = renderer.getRenderOutput();
    const [, values]: any[] = React.Children.toArray(section.props.children);
    const [, , , , bodyLink]: any[] = React.Children.toArray(values.props.children);
    expect(bodyLink.props).toEqual({
      displayName: 'Body',
      value: minimal?.request?.bodyLink,
      visible: true,
    });
  });

  it('should not render when there is no request', () => {
    renderer.render(<Request request={undefined} />);

    const section = renderer.getRenderOutput();
    expect(section).toBeNull();
  });
});
