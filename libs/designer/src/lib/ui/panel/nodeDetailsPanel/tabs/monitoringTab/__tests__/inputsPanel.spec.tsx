import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, beforeEach, it, expect } from 'vitest';
import { InputsPanel, type InputsPanelProps } from '../inputsPanel';

describe('InputsPanel', () => {
  let props: InputsPanelProps;

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

  const renderComponent = (props) => {
    return render(
      <IntlProvider locale="en">
        <InputsPanel {...props} />
      </IntlProvider>
    );
  };

  const defaultProps = {};

  it('should render the InputsPanel with inputs', () => {
    const { asFragment } = renderComponent(defaultProps);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render the InputsPanel with no inputs', () => {
    const props = {
      ...defaultProps,
      runMetaData: {
        inputsLink: {
          uri: 'http://example.com',
          secureData: null,
        },
        inputs: null,
      },
    };
    const { asFragment } = renderComponent(props);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render the InputsPanel with secure data', () => {
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
    const props = {
      ...defaultProps,
      isLoading: true,
    };
    const { asFragment } = renderComponent(props);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render error state', () => {
    const props = {
      ...defaultProps,
      isError: true,
    };
    const { asFragment } = renderComponent(props);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should call onSeeRawInputsClick when link is clicked', () => {
    const props = {
      ...defaultProps,
      runMetaData: {
        inputsLink: {
          uri: 'http://example.com',
          secureData: null,
        },
        inputs: { key: 'value' },
      },
    };
    renderComponent(props);
    const link = screen.getByText('Show raw inputs');
    fireEvent.click(link);
    // Add your assertion here to check if the function was called
  });

  it('should toggle showMore state when onMoreClick is called', () => {
    const { getByText } = renderComponent(defaultProps);
    const moreButton = getByText('Show more');
    fireEvent.click(moreButton);
    expect(moreButton.textContent).toBe('Show less');
    fireEvent.click(moreButton);
    expect(moreButton.textContent).toBe('Show more');
  });
});
