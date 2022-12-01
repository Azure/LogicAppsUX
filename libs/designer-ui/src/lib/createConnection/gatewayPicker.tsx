import type { IDropdownOption } from '@fluentui/react';
import { Dropdown } from '@fluentui/react';
import type { Gateway, Subscription } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

const GatewayPicker = (props: any) => {
  const {
    key,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
    isLoading,
    setParameterValues,
    parameterValues,
  } = props;

  const intl = useIntl();

  const newGatewayUrl = 'http://aka.ms/logicapps-installgateway';
  const newGatewayOption: IDropdownOption<any> = {
    key: newGatewayUrl,
    text: intl.formatMessage(
      {
        defaultMessage: '{addIcon} Install Gateway',
        description: 'Option to install a new gateway, links to new page',
      },
      { addIcon: '+ ' }
    ),
  };

  const gatewayOptions = [
    ...(availableGateways ?? [])
      .map((gateway: Gateway) => ({
        key: gateway.id,
        text: gateway.properties.displayName ?? '',
      }))
      .sort((a: any, b: any) => a.text.localeCompare(b.text)),
    newGatewayOption,
  ];

  const subscriptionDropdownLabel = intl.formatMessage({
    defaultMessage: 'Subscription',
    description: 'Subscription dropdown label',
  });

  const gatewayDropdownLabel = intl.formatMessage({
    defaultMessage: 'Gateway',
    description: 'Gateway dropdown label',
  });

  return (
    <div style={{ width: 'inherit' }}>
      <Dropdown
        id={`connection-param-${key}-subscriptions`}
        label={subscriptionDropdownLabel}
        className="connection-parameter-input"
        selectedKey={selectedSubscriptionId}
        onChange={(e: any, newVal?: IDropdownOption) => selectSubscriptionCallback?.(newVal?.key as string)}
        disabled={isLoading}
        ariaLabel={subscriptionDropdownLabel}
        placeholder={subscriptionDropdownLabel}
        options={(availableSubscriptions ?? [])
          .map((subscription: Subscription) => ({
            key: subscription.id,
            text: subscription.displayName,
          }))
          .sort((a: any, b: any) => a.text.localeCompare(b.text))}
        styles={{ callout: { maxHeight: 300 } }}
      />
      <Dropdown
        id={`connection-param-${key}-gateways`}
        label={gatewayDropdownLabel}
        className="connection-parameter-input"
        selectedKey={parameterValues[key]?.id}
        onChange={(e: any, newVal?: IDropdownOption) => {
          if (newVal?.key === newGatewayUrl) {
            window.open(newGatewayUrl, '_blank');
          } else {
            setParameterValues({ ...parameterValues, [key]: { id: newVal?.key.toString() } });
          }
        }}
        disabled={isLoading || !selectedSubscriptionId}
        ariaLabel={gatewayDropdownLabel}
        placeholder={gatewayDropdownLabel}
        options={gatewayOptions}
        styles={{ callout: { maxHeight: 300 } }}
      />
    </div>
  );
};

export default GatewayPicker;
