import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { InputsPanel, type InputsPanelProps } from '../inputsPanel';
import { InitHostService } from '@microsoft/logic-apps-shared';

describe('InputsPanel', () => {
  let defaultProps: InputsPanelProps;

  beforeEach(() => {
    defaultProps = {
      runMetaData: {
        outputsLink: {
          uri: 'http://example.com',
          secureData: undefined,
          contentSize: 1000,
        },
        inputs: { key: 'value' },
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

  const renderComponent = (props) => {
    return render(
      <IntlProvider locale="en">
        <InputsPanel {...props} />
      </IntlProvider>
    );
  };

  it('should render the InputsPanel with inputs', () => {
    const { asFragment } = renderComponent(defaultProps);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render the InputsPanel with no inputs', () => {
    defaultProps.runMetaData.inputs = undefined;
    const { asFragment } = renderComponent(defaultProps);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render the InputsPanel with secure inputs', () => {
    const props = {
      ...defaultProps,
      runMetaData: {
        inputsLink: {
          uri: 'http://example.com',
          secureData: {},
        },
        inputs: null,
      },
    };
    const { asFragment } = renderComponent(props);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render loading state', () => {
    defaultProps.isLoading = true;
    const { asFragment } = renderComponent(defaultProps);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render error state', () => {
    defaultProps.isError = true;
    const { asFragment } = renderComponent(defaultProps);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should call onSeeRawInputsClick when link is clicked', () => {
    const hostService = {
      fetchAndDisplayContent: async () => Promise.resolve('Clicked'),
    } as any;
    InitHostService(hostService);

    renderComponent(defaultProps);
    const fetchAndDisplayContentSpy = vi.spyOn(hostService, 'fetchAndDisplayContent');
    const link = screen.getByText('Show raw inputs');
    fireEvent.click(link);
    expect(fetchAndDisplayContentSpy).toHaveBeenCalled();
  });
});
