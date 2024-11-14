import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import renderer from 'react-test-renderer';
import React, { ReactElement } from 'react';
import { GatewayPicker, GatewayPickerProps } from '../formInputs/gatewayPicker';

describe('ui/connectionParameterRow', () => {
  const render = (props: GatewayPickerProps) => {
    const gatewayPicker = renderer.create(<GatewayPicker {...props} />);
    // const children = React.Children.toArray(connectionParameterRow.props.children) as ReactElement[];
    // expect(children.length).toEqual(2);
    // const [label, input] = children;

    // return {
    //   connectionParameterRow,
    //   label,
    //   input,
    // };
    return gatewayPicker;
  };

  it('should call correct subscription and gateway', () => {
    const gatewayPickerProps: GatewayPickerProps = {
      parameterKey: 'parameterKey',
      selectedSubscriptionId: 'selectedSubscriptionId',
      selectSubscriptionCallback: vi.fn(),
      availableGateways: [],
      availableSubscriptions: [],
      isSubscriptionDropdownDisabled: false,
      isLoading: false,
      value: '',
      setValue: vi.fn(),
    };
    const gatewayPicker = render(gatewayPickerProps);
  });
});
