import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OutputsPanel, type OutputsPanelProps } from '../outputsPanel';
import { IntlProvider } from 'react-intl';
import { InitHostService } from '@microsoft/logic-apps-shared';
import { render, screen, fireEvent } from '@testing-library/react';

describe('OutputsPanel', () => {
  let defaultProps: OutputsPanelProps;

  beforeEach(() => {
    defaultProps = {
      runMetaData: {
        outputsLink: {
          uri: 'http://example.com',
          secureData: undefined,
          contentSize: 1000,
        },
        outputs: { key: 'value' },
        inputsLink: {
          uri: 'http://example.com',
          secureData: undefined,
          contentSize: 1000,
        },
        retryHistory: [],
        startTime: '2024-11-05T17:22:57.285884Z',
        endTime: '2024-11-05T17:22:57.4352823Z',
        correlation: {
          actionTrackingId: '3f32b3a2-a1d3-4857-9a14-bd95c22bb949',
          clientTrackingId: '08584707795132773544471342544CU00',
        },
        status: 'Succeeded',
        code: 'NotSpecified',
        duration: '0.2s',
      },
      brandColor: '#000000',
      nodeId: 'node1',
      isLoading: false,
      isError: false,
    };
  });

  const renderComponent = (props: OutputsPanelProps) =>
    render(
      <IntlProvider locale="en">
        <OutputsPanel {...props} />
      </IntlProvider>
    );

  it('Should render OutputsPanel with outputs', () => {
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with loading state', () => {
    defaultProps.isLoading = true;
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with error state', () => {
    defaultProps.isError = true;
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with no outputs', () => {
    defaultProps.runMetaData.outputs = undefined;
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with secured outputs', () => {
    defaultProps.runMetaData.outputsLink.secureData = {};
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel without uri', () => {
    defaultProps.runMetaData.outputsLink = { contentSize: 0 };
    const renderedComponent = renderComponent(defaultProps);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('should call onSeeRawOutputsClick when link is clicked', () => {
    const hostService = {
      fetchAndDisplayContent: async () => Promise.resolve('Clicked'),
    } as any;
    InitHostService(hostService);

    renderComponent(defaultProps);
    const fetchAndDisplayContentSpy = vi.spyOn(hostService, 'fetchAndDisplayContent');
    const link = screen.getByText('Show raw outputs');
    fireEvent.click(link);
    expect(fetchAndDisplayContentSpy).toHaveBeenCalled();
  });
});
