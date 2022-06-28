import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedIse, updateSelectedSubscripton } from '../../../state/vscodeSlice';
import type { initializedVscodeState } from '../../../state/vscodeSlice';
import { parseIseData, parseSubscriptionsData } from './helper';
import { Dropdown, Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const InstanceSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as initializedVscodeState;
  const { selectedSubscription } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

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

  const loadIse = () => {
    return apiService.getIse(selectedSubscription);
  };

  const { data: subscriptionsData, isLoading: isSubscriptionsLoading } = useQuery<any>(QueryKeys.subscriptionData, loadSubscriptions, {
    refetchOnWindowFocus: false,
  });

  const {
    data: iseData,
    isLoading: isIseLoading,
    refetch: refetchIse,
  } = useQuery<any>(QueryKeys.iseData, loadIse, {
    refetchOnWindowFocus: false,
    enabled: selectedSubscription !== '',
  });

  const onChangeSubscriptions = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      dispatch(
        updateSelectedSubscripton({
          selectedSubscription: selectedOption.key,
        })
      );

      if (selectedSubscription !== '') {
        refetchIse();
      }
    }
  };

  const onChangeIse = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      dispatch(
        updateSelectedIse({
          selectedIse: selectedOption.key,
        })
      );
    }
  };

  const subscriptions: IDropdownOption[] = isSubscriptionsLoading || !subscriptionsData ? [] : parseSubscriptionsData(subscriptionsData);

  const iseInstances: IDropdownOption[] = isIseLoading || selectedSubscription === '' || !subscriptionsData ? [] : parseIseData(iseData);

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
        onChange={onChangeSubscriptions}
        className="msla-export-instance-panel-dropdown"
      />
      <Dropdown
        label={intlText.SELECTION_ISE}
        options={iseInstances}
        placeholder={intlText.SELECT_OPTION}
        disabled={isIseLoading || selectedSubscription === ''}
        onChange={onChangeIse}
        className="msla-export-instance-panel-dropdown"
      />
    </div>
  );
};
