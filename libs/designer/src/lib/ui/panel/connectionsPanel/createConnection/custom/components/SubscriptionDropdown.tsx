import { isUndefinedOrEmptyString, type Subscription } from '@microsoft/logic-apps-shared';
import { ConnectionParameterRow } from '../../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useMemo, useRef, useState } from 'react';
import type { IComboBox } from '@fluentui/react';
import { ComboBox, Spinner } from '@fluentui/react';
import { useStyles } from '../styles';

interface SubscriptionDropdownProps {
  subscriptions?: Subscription[];
  isFetchingSubscriptions?: boolean;
  selectedSubscriptionId: string;
  setSelectedSubscriptionId: (subscriptionId: string) => void;
  title: string;
}

export const SubscriptionDropdown = ({
  subscriptions,
  isFetchingSubscriptions,
  selectedSubscriptionId,
  setSelectedSubscriptionId,
  title,
}: SubscriptionDropdownProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const [subscriptionInputText, setSubscriptionInputText] = useState<string>('');

  const stringResources = useMemo(
    () => ({
      SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Subscription',
        id: 'cAPPxZ',
        description: 'Label for subscription dropdown',
      }),
      LOADING_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Loading all subscriptions...',
        id: '+ThyFK',
        description: 'Loading subscription message',
      }),
    }),
    [intl]
  );

  const subscriptionOptions = useMemo(() => {
    return (subscriptions ?? [])
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((subscription: Subscription) => {
        const id = subscription.id.split('/subscriptions/')[1];
        return {
          key: id,
          text: `${subscription.displayName} (${id})`,
        };
      });
  }, [subscriptions]);

  const comboRef = useRef<IComboBox>(null);

  return (
    <ConnectionParameterRow parameterKey={'subscription-id'} displayName={stringResources.SUBSCRIPTION} required={true}>
      <ComboBox
        autoFocus={false}
        componentRef={comboRef}
        allowFreeform
        autoComplete="on"
        required={true}
        disabled={isFetchingSubscriptions}
        placeholder={isFetchingSubscriptions ? stringResources.LOADING_SUBSCRIPTION : title}
        selectedKey={isUndefinedOrEmptyString(selectedSubscriptionId) ? null : selectedSubscriptionId}
        className={styles.subscriptionCombobox}
        options={subscriptionOptions}
        text={subscriptionInputText}
        onClick={() => {
          if (!isFetchingSubscriptions) {
            comboRef.current?.focus(true);
          }
        }}
        onChange={(_e, option) => {
          if (option?.key) {
            setSelectedSubscriptionId(option.key as string);
            setSubscriptionInputText(option.text);
          }
        }}
        onPendingValueChanged={(_option, _index, text) => setSubscriptionInputText(text ?? '')}
      >
        {isFetchingSubscriptions ? (
          <Spinner
            style={{ position: 'absolute', bottom: '6px', left: '8px' }}
            labelPosition="right"
            label={stringResources.LOADING_SUBSCRIPTION}
          />
        ) : null}
      </ComboBox>
    </ConnectionParameterRow>
  );
};
