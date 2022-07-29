import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedIse, updateSelectedSubscripton } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { parseIseData, parseSubscriptionsData } from './helper';
import { Dropdown, Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const InstanceSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic app instance',
      description: 'Select logic app instance title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      description: 'Select apps to export description',
    }),
    SELECTION_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Select a subscription',
      description: 'Select a subscription',
    }),
    SELECTION_ISE: intl.formatMessage({
      defaultMessage: 'Select an integration service environment (ISE) instance',
      description: 'Select an ISE instance',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      description: 'Select an option placeholder',
    }),
    EMPTY_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'No subscriptions available',
      description: 'No subscriptions available',
    }),
    EMPTY_ISE: intl.formatMessage({
      defaultMessage: 'No ISE instances available',
      description: 'No ISE instances available',
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
  } = useQuery<any>([QueryKeys.iseData, { subscriptionId: selectedSubscription }], loadIse, {
    refetchOnWindowFocus: false,
    enabled: selectedSubscription !== '',
  });

  const onChangeSubscriptions = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption && selectedSubscription !== selectedOption.key) {
      const subscriptionId = selectedOption.key as string;
      dispatch(
        updateSelectedSubscripton({
          selectedSubscription: subscriptionId,
        })
      );
      refetchIse();
    }
  };

  const onChangeIse = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      const iseId = selectedOption.key as string;
      dispatch(
        updateSelectedIse({
          selectedIse: iseId,
          location: selectedOption.data,
        })
      );
    }
  };

  const subscriptions: IDropdownOption[] = isSubscriptionsLoading || !subscriptionsData ? [] : parseSubscriptionsData(subscriptionsData);

  const iseInstances: IDropdownOption[] = isIseLoading || selectedSubscription === '' || !iseData ? [] : parseIseData(iseData);

  return (
    <div className="msla-export-instance-panel">
      <Text variant="xLarge" block>
        {intlText.SELECT_TITLE}
      </Text>
      <Text variant="large" block>
        {intlText.SELECT_DESCRIPTION}
      </Text>
      <Dropdown
        label={intlText.SELECTION_SUBSCRIPTION}
        options={subscriptions}
        placeholder={subscriptions.length ? intlText.SELECT_OPTION : intlText.EMPTY_SUBSCRIPTION}
        disabled={isSubscriptionsLoading || !subscriptions.length}
        onChange={onChangeSubscriptions}
        selectedKey={selectedSubscription !== '' ? selectedSubscription : null}
        className="msla-export-instance-panel-dropdown"
      />
      <Dropdown
        label={intlText.SELECTION_ISE}
        options={iseInstances}
        placeholder={iseInstances.length ? intlText.SELECT_OPTION : intlText.EMPTY_ISE}
        disabled={isSubscriptionsLoading || isIseLoading || selectedSubscription === '' || !iseInstances.length}
        onChange={onChangeIse}
        selectedKey={selectedIse !== '' ? selectedIse : null}
        className="msla-export-instance-panel-dropdown"
      />
    </div>
  );
};
