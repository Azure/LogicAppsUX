import { MessageBarType } from '@fluentui/react';
import React from 'react';
import ReactShallowRenderer from 'react-test-renderer/shallow';
import { Overview, OverviewProps } from '..';

describe('lib/overview', () => {
  let minimal: OverviewProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      hasMoreRuns: false,
      loading: false,
      runItems: [],
      workflowProperties: {
        callbackInfo: {
          value: 'workflowProperties.callbackInfo.value',
        },
        name: 'workflowProperties.name',
        operationOptions: 'workflowProperties.operationOptions',
        stateType: 'workflowProperties.stateType',
      },
      onLoadMoreRuns: jest.fn(),
      onLoadRuns: jest.fn(),
      onOpenRun: jest.fn(),
      onRunTrigger: jest.fn(),
      onVerifyRunId: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('renders correctly', () => {
    renderer.render(<Overview {...minimal} />);

    const root = renderer.getRenderOutput();
    expect(root.type).toBe('div');

    const [commandBar, properties, pivot]: any[] = React.Children.toArray(root.props.children);
    expect(commandBar.props.callbackInfo).toEqual(minimal.workflowProperties.callbackInfo);
    expect(properties.props).toEqual(minimal.workflowProperties);

    const pivotItem = React.Children.only(pivot.props.children);
    expect(pivotItem.props.headerText).toBe('Run History');

    const [filter, history]: any[] = React.Children.toArray(pivotItem.props.children);
    expect(filter.props.className).toBe('msla-run-history-filter');
    expect(history.props).toEqual(
      expect.objectContaining({
        items: [],
        loading: false,
      })
    );

    const [textField, iconButton]: any[] = React.Children.toArray(filter.props.children);
    expect(textField.props).toEqual(
      expect.objectContaining({
        deferredValidationTime: 1000,
        placeholder: `Enter the run identifier to open the run`,
        styles: {
          root: {
            flex: 1,
          },
        },
        validateOnLoad: false,
      })
    );
    expect(iconButton.props).toEqual(
      expect.objectContaining({
        'aria-label': 'Enter the run identifier to open the run',
        disabled: true,
        iconProps: {
          iconName: 'NavigateForward',
        },
        title: 'Enter the run identifier to open the run',
      })
    );
  });

  it('renders a CORS notice', () => {
    const corsNotice = 'To view runs, set "*" to allowed origins in the CORS setting.';
    renderer.render(<Overview {...minimal} corsNotice={corsNotice} />);

    const root = renderer.getRenderOutput();
    const [, , , messageBar]: any[] = React.Children.toArray(root.props.children);
    expect(messageBar.props.children).toBe(corsNotice);
    expect(messageBar.props.messageBarType).toBe(MessageBarType.info);
  });

  it('renders an error message', () => {
    const errorMessage = '504 GatewayTimeout';
    renderer.render(<Overview {...minimal} errorMessage={errorMessage} />);

    const root = renderer.getRenderOutput();
    const [, , pivot]: any[] = React.Children.toArray(root.props.children);
    const pivotItem = React.Children.only(pivot.props.children);
    const [, , error]: any[] = React.Children.toArray(pivotItem.props.children);
    expect(error.props.children).toBe(errorMessage);
  });

  it('renders a load more button when there are more runs', () => {
    renderer.render(<Overview {...minimal} hasMoreRuns={true} />);

    const root = renderer.getRenderOutput();
    const [, , pivot]: any[] = React.Children.toArray(root.props.children);
    const pivotItem = React.Children.only(pivot.props.children);
    const [, , button]: any[] = React.Children.toArray(pivotItem.props.children);
    expect(button.props.children).toBe('Load more');
    expect(button.props.className).toBe('msla-button msla-overview-load-more');
  });

  it('renders a shimmered run history details list when loading ', () => {
    renderer.render(<Overview {...minimal} loading={true} />);

    const root = renderer.getRenderOutput();
    const [, , pivot]: any[] = React.Children.toArray(root.props.children);
    const pivotItem = React.Children.only(pivot.props.children);
    const [, history]: any[] = React.Children.toArray(pivotItem.props.children);
    expect(history.props.loading).toBe(true);
  });
});
