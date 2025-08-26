import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { GatewayPicker, GatewayPickerProps } from '../formInputs/gatewayPicker';
import { Gateway } from '@microsoft/logic-apps-shared';

describe('ui/connectionParameterRow', () => {
  const renderGatewayPicker = (props: GatewayPickerProps) => {
    const gatewayPicker = render(<GatewayPicker {...props} />);

    return gatewayPicker;
  };

  const availableSubscriptions = [
    {
      authorizationSource: 'RoleBased',
      displayName: 'First-Sub',
      id: '/subscriptions/99000e5a-1088-4d14-b221-2bd05130e834',
      managedByTenants: [],
      state: 'Enabled',
      subscriptionId: '99000e5a-1088-4d14-b221-2bd05130e834',
      subscriptionPolicies: {
        locationPlacementId: 'Internal_2014-09-01',
        quotaId: 'Internal_2014-09-01',
        spendingLimit: 'Off',
      },
      tenantId: '0c564d5b-6ec2-4ec3-bded-a4a78302313e',
    },
    {
      authorizationSource: 'RoleBased',
      displayName: 'Second-Sub',
      id: '/subscriptions/99000e5a-1088-4d14-b221-2bd05130e834',
      managedByTenants: [],
      state: 'Enabled',
      subscriptionId: '99000e5a-1088-4d14-b221-2bd05130e834',
      subscriptionPolicies: {
        locationPlacementId: 'Internal_2014-09-01',
        quotaId: 'Internal_2014-09-01',
        spendingLimit: 'Off',
      },
      tenantId: '0c564d5b-6ec2-4ec3-bded-a4a78302313e',
    },
  ];

  const availableGateways = [
    {
      id: '/subscriptions/99000e5a-1088-4d14-b221-2bd05130e834/resourceGroups/danielle/providers/Microsoft.Web/connectionGateways/danielle2024gateway',
      properties: {
        displayName: 'Danielle2024Gateway',
      },
    },
  ] as Gateway[];

  it('should call correct subscription and gateway', () => {
    const gatewayPickerProps: GatewayPickerProps = {
      parameterKey: 'parameterKey',
      selectedSubscriptionId: 'selectedSubscriptionId',
      selectSubscriptionCallback: vi.fn(),
      availableGateways: availableGateways,
      availableSubscriptions,
      isSubscriptionDropdownDisabled: false,
      isLoading: false,
      value: '',
      setValue: vi.fn(),
    };
    const gatewayPicker = renderGatewayPicker(gatewayPickerProps);

    // open the subscription dropdown
    const subscriptionDropdown = screen.getByLabelText('Subscription');
    fireEvent.click(subscriptionDropdown);

    // expect dropdown to have 2 options
    const subscription1 = screen.getByText(availableSubscriptions[0].displayName);
    const subscription2 = screen.getByText(availableSubscriptions[1].displayName);
    expect(subscription1).toBeDefined();
    expect(subscription2).toBeDefined();

    // select the first subscription
    fireEvent.click(subscription1);

    // open the gateway dropdown
    const gatewayDropdown = screen.getByLabelText('Gateway');
    fireEvent.click(gatewayDropdown);

    // expect dropdown to have 2 options
    const gateway1 = screen.getByText(availableGateways[0].properties.displayName);
    const gatewayNew = screen.getAllByRole('option')[1]; // text for this is "+ Install gateway"
    expect(gateway1).toBeDefined();
    expect(gatewayNew).toBeDefined();

    // select the first gateway
    fireEvent.click(gateway1);

    // expect correct IDs to be passed to the callback functions
    expect(gatewayPickerProps.setValue).toHaveBeenCalledWith({ id: availableGateways[0].id });
    expect(gatewayPickerProps.selectSubscriptionCallback).toHaveBeenCalledWith(availableSubscriptions[0].id);
  });
});
