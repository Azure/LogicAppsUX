import type { IDropdownOption } from '@fluentui/react';
import { Dropdown } from '@fluentui/react';
import type { Gateway, Subscription } from '@microsoft/utils-logic-apps';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

const GatewayPicker = (props: any) => {
  const {
    parameterKey,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
    isSubscriptionDropdownDisabled,
    isLoading,
    value,
    setValue,
  } = props;

  const intl = useIntl();

  const newGatewayUrl = 'http://aka.ms/logicapps-installgateway';
  const newGatewayOption: IDropdownOption<any> = useMemo(
    () => ({
      key: newGatewayUrl,
      text: intl.formatMessage(
        {
          defaultMessage: '{addIcon} Install Gateway',
          description: 'Option to install a new gateway, links to new page',
        },
        { addIcon: '+ ' }
      ),
    }),
    [intl]
  );

  const subscriptionOptions = useMemo(
    () =>
      (availableSubscriptions ?? [])
        .map((subscription: Subscription) => ({
          key: subscription.id,
          text: subscription.displayName,
        }))
        .sort((a: any, b: any) => a.text.localeCompare(b.text)),
    [availableSubscriptions]
  );

  const gatewayOptions = useMemo(
    () => [
      ...(availableGateways ?? [])
        .map((gateway: Gateway) => ({
          key: gateway.id,
          text: gateway.properties.displayName ?? '',
        }))
        .sort((a: any, b: any) => a.text.localeCompare(b.text)),
      newGatewayOption,
    ],
    [availableGateways, newGatewayOption]
  );

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
      {!isSubscriptionDropdownDisabled && (
        <Dropdown
          id={`connection-param-${parameterKey}-subscriptions`}
          label={subscriptionDropdownLabel}
          className="connection-parameter-input"
          selectedKey={selectedSubscriptionId}
          onChange={(e: any, newVal?: IDropdownOption) => selectSubscriptionCallback?.(newVal?.key as string)}
          disabled={isLoading}
          ariaLabel={subscriptionDropdownLabel}
          placeholder={subscriptionDropdownLabel}
          options={subscriptionOptions}
          styles={{ callout: { maxHeight: '300px' } }}
        />
      )}
      <Dropdown
        id={`connection-param-${parameterKey}-gateways`}
        label={gatewayDropdownLabel}
        className="connection-parameter-input"
        selectedKey={value?.id}
        onChange={(e: any, newVal?: IDropdownOption) => {
          if (newVal?.key === newGatewayUrl) {
            window.open(newGatewayUrl, '_blank');
          } else {
            setValue({ id: newVal?.key.toString() });
          }
        }}
        disabled={isLoading || !(selectedSubscriptionId || isSubscriptionDropdownDisabled)}
        ariaLabel={gatewayDropdownLabel}
        placeholder={gatewayDropdownLabel}
        options={gatewayOptions}
        styles={{ callout: { maxHeight: '300px' } }}
      />
    </div>
  );
};

export default GatewayPicker;
