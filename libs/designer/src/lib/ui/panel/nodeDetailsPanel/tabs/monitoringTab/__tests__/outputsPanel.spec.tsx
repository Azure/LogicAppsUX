import { describe, beforeEach, it, expect } from 'vitest';
import { OutputsPanel, type OutputsPanelProps } from '../outputsPanel';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';

describe('OutputsPanel', () => {
  let props: OutputsPanelProps;

  beforeEach(() => {
    props = {
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
    renderer
      .create(
        <IntlProvider locale="en">
          <OutputsPanel {...props} />
        </IntlProvider>
      )
      .toJSON();

  it('Should render OutputsPanel with outputs', () => {
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with loading state', () => {
    props.isLoading = true;
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with error state', () => {
    props.isError = true;
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with no outputs', () => {
    props.runMetaData.outputs = undefined;
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel with secured outputs', () => {
    props.runMetaData.outputsLink.secureData = {};
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render OutputsPanel without uri', () => {
    props.runMetaData.outputsLink = { contentSize: 0 };
    const renderedComponent = renderComponent(props);
    expect(renderedComponent).toMatchSnapshot();
  });
});
