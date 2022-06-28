import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { useOutlet } from '../export';
import { parseSubscriptionsData } from './helper';
import { Dropdown, Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

export const InstanceSelection: React.FC = () => {
  const { baseUrl, accessToken } = useOutlet();
  const intl = useIntl();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select Logic App Instance',
      description: 'Select logic app instance title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage:
        'Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas',
      description: 'Select apps to export description',
    }),
    SELECTION_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Select a Subscription',
      description: 'Select a subscription',
    }),
    SELECTION_ISE: intl.formatMessage({
      defaultMessage: 'Select an ISE (Integration Service Environment) instance',
      description: 'Select an ISE instance',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      description: 'Select an option placeholder',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const loadSubscriptions = () => {
    return apiService.getSubscriptions();
  };

  const { data: subscriptionsData, isLoading: isSubscriptionsLoading } = useQuery<any>(QueryKeys.subscriptionData, loadSubscriptions, {
    refetchOnWindowFocus: false,
  });

  const subscriptions: IDropdownOption[] = isSubscriptionsLoading ? [] : parseSubscriptionsData(subscriptionsData);

  const iseInstances: IDropdownOption[] = [];

  return (
    <div className="msla-export-instance-panel">
      <Text variant="xLarge" nowrap block>
        {intlText.SELECT_TITLE}
      </Text>
      <Text variant="large" nowrap block>
        {intlText.SELECT_DESCRIPTION}
      </Text>
      <Dropdown
        label={intlText.SELECTION_SUBSCRIPTION}
        options={subscriptions}
        placeholder={intlText.SELECT_OPTION}
        disabled={isSubscriptionsLoading}
        className="msla-export-instance-panel-dropdown"
      />
      <Dropdown
        label={intlText.SELECTION_ISE}
        options={iseInstances}
        placeholder={intlText.SELECT_OPTION}
        className="msla-export-instance-panel-dropdown"
      />
    </div>
  );
};
