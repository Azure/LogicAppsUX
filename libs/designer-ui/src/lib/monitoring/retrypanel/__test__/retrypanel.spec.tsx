import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { RetryPanel, RetryPanelProps } from '../index';

describe('lib/monitoring/retrypanel', () => {
  let minimal: RetryPanelProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      retryHistories: [
        {
          clientRequestId: 'clientRequestId',
          code: 'code',
          startTime: '2022-02-08T19:52:00Z',
        },
      ],
      visible: true,
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<RetryPanel {...minimal} />);

    const fragment = renderer.getRenderOutput();
    const [pagerContainer, content]: any[] = React.Children.toArray(fragment.props.children);
    expect(pagerContainer.props.className).toBe('msla-retrypanel-callout-pager');
    expect(content.props.className).toBe('msla-panel-callout-content');

    const pager = React.Children.only(pagerContainer.props.children);
    expect(pager.props).toEqual(
      expect.objectContaining({
        current: 1,
        max: minimal.retryHistories.length,
        maxLength: 2,
        min: 1,
        pagerTitleText: 'Retry',
        readonlyPagerInput: true,
      })
    );

    const section = React.Children.only(content.props.children);
    expect(section.props.className).toBe('msla-trace-inputs-outputs');

    const [headerContainer, values]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');

    const header = React.Children.only(headerContainer.props.children);
    expect(header.props.children).toBe('Retry');

    const [retry] = minimal.retryHistories;
    const [duration, startTime, endTime, status, clientRequestId]: any[] = React.Children.toArray(values.props.children);
    expect(duration.props).toEqual({
      displayName: 'Duration',
      value: '--',
    });
    expect(startTime.props).toEqual({
      displayName: 'Start time',
      format: 'date-time',
      value: retry.startTime,
    });
    expect(endTime.props).toEqual({
      displayName: 'End time',
      format: 'date-time',
      value: undefined,
      visible: false,
    });
    expect(status.props).toEqual({
      displayName: 'Status',
      value: retry.code,
    });
    expect(clientRequestId.props).toEqual({
      displayName: 'Client request ID',
      value: retry.clientRequestId,
    });
  });

  it('should render an end time and duration when available', () => {
    const [retry] = minimal.retryHistories;
    retry.endTime = '2022-02-08T20:10:00Z';
    renderer.render(<RetryPanel {...minimal} />);

    const fragment = renderer.getRenderOutput();
    const [, content]: any[] = React.Children.toArray(fragment.props.children);
    const section = React.Children.only(content.props.children);
    const [, values]: any[] = React.Children.toArray(section.props.children);
    const [duration, , endTime]: any[] = React.Children.toArray(values.props.children);
    expect(duration.props.value).toBe('18 minutes');
    expect(endTime.props).toEqual(
      expect.objectContaining({
        value: retry.endTime,
        visible: true,
      })
    );
  });

  it('should render a service request ID when available', () => {
    const [retry] = minimal.retryHistories;
    retry.serviceRequestId = 'serviceRequestId';
    renderer.render(<RetryPanel {...minimal} />);

    const fragment = renderer.getRenderOutput();
    const [, content]: any[] = React.Children.toArray(fragment.props.children);
    const section = React.Children.only(content.props.children);
    const [, values]: any[] = React.Children.toArray(section.props.children);
    const [, , , , , serviceRequestId]: any[] = React.Children.toArray(values.props.children);
    expect(serviceRequestId.props).toEqual({
      displayName: 'Service request ID',
      value: retry.serviceRequestId,
      visible: true,
    });
  });

  it('should render an error when available', () => {
    const [retry] = minimal.retryHistories;
    retry.error = {
      code: 'errorCode',
      message: 'errorMessage',
    };
    renderer.render(<RetryPanel {...minimal} />);

    const fragment = renderer.getRenderOutput();
    const [, content]: any[] = React.Children.toArray(fragment.props.children);
    const section = React.Children.only(content.props.children);
    const [, values]: any[] = React.Children.toArray(section.props.children);
    const [, , , , , , error]: any[] = React.Children.toArray(values.props.children);
    expect(error.props).toEqual({
      displayName: 'Error',
      value: retry.error,
      visible: true,
    });
  });

  it('should not render when not visible', () => {
    renderer.render(<RetryPanel {...minimal} visible={false} />);
    expect(renderer.getRenderOutput()).toBeNull();
  });
});
