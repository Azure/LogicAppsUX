import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { RequestPanel, RequestPanelProps } from '../index';

describe('lib/monitoring/requestpanel', () => {
  let minimal: RequestPanelProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      requestHistory: [
        {
          properties: {
            endTime: '2022-02-09T13:53:00Z',
            startTime: '2022-02-09T13:52:00Z',
          },
        },
      ],
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const [requestHistory] = minimal.requestHistory;
    renderer.render(<RequestPanel {...minimal} />);

    const section = renderer.getRenderOutput();
    const [pagerContainer, calloutContent]: any[] = React.Children.toArray(section.props.children);
    expect(pagerContainer.props.className).toBe('msla-retrypanel-callout-pager');
    expect(calloutContent.props.className).toBe('msla-panel-callout-content');

    const pager = React.Children.only(pagerContainer.props.children);
    expect(pager.props).toEqual(
      expect.objectContaining({
        current: 1,
        max: 1,
        maxLength: 2,
        min: 1,
        pagerTitleText: 'Request',
        readonlyPagerInput: true,
      })
    );

    const [errorSection, durationContainer, request, response]: any[] = React.Children.toArray(calloutContent.props.children);
    expect(errorSection.props.className).toBe('msla-request-history-panel-error');
    expect(errorSection.props.error).toBe(requestHistory?.properties?.error);
    expect(durationContainer.props.className).toBe('msla-trace-inputs-outputs');
    expect(request.props.request).toEqual(requestHistory?.properties?.request);
    expect(response.props.response).toEqual(requestHistory?.properties?.response);

    const [durationHeaderContainer, durationValues]: any[] = React.Children.toArray(durationContainer.props.children);
    expect(durationHeaderContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(durationValues.props.className).toBe('msla-trace-values');

    const durationHeader = React.Children.only(durationHeaderContainer.props.children);
    expect(durationHeader.props.children).toBe('Duration');

    const [duration, startTime, endTime]: any[] = React.Children.toArray(durationValues.props.children);
    expect(duration.props).toEqual({
      displayName: 'Duration',
      value: '1 minute',
    });
    expect(startTime.props).toEqual({
      displayName: 'Start time',
      format: 'date-time',
      value: requestHistory?.properties?.startTime,
    });
    expect(endTime.props).toEqual({
      displayName: 'End time',
      format: 'date-time',
      value: requestHistory?.properties?.endTime,
    });
  });

  it('should not render when not visible', () => {
    renderer.render(<RequestPanel {...minimal} visible={false} />);

    const section = renderer.getRenderOutput();
    expect(section).toBeNull();
  });
});
