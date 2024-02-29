import { type ISubscription, QueryKeys, type IIse, type IRegion } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateSelectedLocation, updateSelectedSubscripton } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { getDropdownPlaceholder, parseIseList, parseRegionList, parseSubscriptionsList } from './helper';
import { Text, DropdownMenuItemType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const InstanceSelection: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, selectedIse, location } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    DIVIDER_REGIONS: intl.formatMessage({
      defaultMessage: 'Regions',
      description: 'Divider title for azure regions',
    }),
    DIVIDER_ISE: intl.formatMessage({
      defaultMessage: 'Integration service environments',
      description: 'Divider title for ISE',
    }),
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
    SELECTION_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a region or an integration service environment (ISE) instance',
      description: 'Select a region or an ISE instance',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      description: 'Select an option placeholder',
    }),
    EMPTY_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'No subscriptions available',
      description: 'No subscriptions available',
    }),
    EMPTY_LOCATION: intl.formatMessage({
      defaultMessage: 'No regions and integration service environment (ISE) instances available',
      description: 'No regions and ISE instances available text',
    }),
    SEARCH_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Find and select subscription',
      description: 'Find and select subscription text',
    }),
    SEARCH_LOCATION: intl.formatMessage({
      defaultMessage: 'Find and select region or integration service environment (ISE)',
      description: 'Find region or ISE text',
    }),
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading...',
      description: 'Loading text',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
    });
  }, [accessToken, baseUrl, cloudHost]);

  const loadSubscriptions = () => {
    return apiService.getSubscriptions();
  };

  const loadIse = () => {
    return apiService.getIse(selectedSubscription);
  };

  const loadRegion = () => {
    return apiService.getRegions(selectedSubscription);
  };

  const { data: subscriptionsList, isLoading: isSubscriptionsLoading } = useQuery<Array<ISubscription>>(
    QueryKeys.subscriptionData,
    loadSubscriptions,
    {
      refetchOnWindowFocus: false,
      enabled: accessToken !== undefined,
      retry: 4,
    }
  );

  const {
    data: regionData,
    isLoading: isRegionLoading,
    refetch: refetchRegion,
  } = useQuery<Array<IRegion>>([QueryKeys.regionData, { subscriptionId: selectedSubscription }], loadRegion, {
    refetchOnWindowFocus: false,
    enabled: !isEmptyString(selectedSubscription),
    retry: 4,
  });

  const {
    data: iseList,
    isLoading: isIseLoading,
    refetch: refetchIse,
  } = useQuery<Array<IIse>>([QueryKeys.iseData, { subscriptionId: selectedSubscription }], loadIse, {
    refetchOnWindowFocus: false,
    enabled: !isEmptyString(selectedSubscription),
    retry: 4,
  });

  const onChangeSubscriptions = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption && selectedSubscription !== selectedOption.key) {
      const subscriptionId = selectedOption.key as string;
      if (!isEmptyString(subscriptionId)) {
        dispatch(
          updateSelectedSubscripton({
            selectedSubscription: subscriptionId,
          })
        );
      }
    }
  };

  useEffect(() => {
    if (!isEmptyString(selectedSubscription)) {
      refetchIse();
      refetchRegion();
    }
  }, [selectedSubscription, refetchIse, refetchRegion]);

  const onChangeLocation = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      const key = selectedOption.key as string;
      if (key.startsWith('ise:')) {
        dispatch(
          updateSelectedLocation({
            selectedIse: key.substring('ise:'.length),
            location: selectedOption.data,
          })
        );
      } else {
        dispatch(
          updateSelectedLocation({
            selectedIse: '',
            location: selectedOption.data,
          })
        );
      }
    }
  };

  const subscriptions: IDropdownOption[] = isSubscriptionsLoading || !subscriptionsList ? [] : parseSubscriptionsList(subscriptionsList);
  const ise: IDropdownOption[] = selectedSubscription !== '' && !isIseLoading && iseList ? parseIseList(iseList) : [];
  const regions: IDropdownOption[] = selectedSubscription !== '' && !isRegionLoading && regionData ? parseRegionList(regionData) : [];

  const locations: IDropdownOption[] =
    ise.length || regions.length
      ? [
          { key: 'divider:ise', text: intlText.DIVIDER_ISE, itemType: DropdownMenuItemType.Divider },
          { key: 'header:ise', text: intlText.DIVIDER_ISE, itemType: DropdownMenuItemType.Header },
          ...ise,
          { key: 'divider:regions', text: intlText.DIVIDER_REGIONS, itemType: DropdownMenuItemType.Divider },
          { key: 'header:regions', text: intlText.DIVIDER_REGIONS, itemType: DropdownMenuItemType.Header },
          ...regions,
        ]
      : [];

  const subscriptionLoading = accessToken === undefined ? true : isSubscriptionsLoading;
  const subscriptionPlaceholder = getDropdownPlaceholder(
    subscriptionLoading,
    subscriptions.length,
    intlText.SELECT_OPTION,
    intlText.EMPTY_SUBSCRIPTION,
    intlText.LOADING
  );

  const iseLoading = isEmptyString(selectedSubscription) ? false : isIseLoading || isRegionLoading;
  const isePlaceholder = getDropdownPlaceholder(
    iseLoading,
    locations.length,
    intlText.SELECT_OPTION,
    intlText.EMPTY_LOCATION,
    intlText.LOADING
  );

  return (
    <div className="msla-export-instance-panel">
      <Text variant="xLarge" block>
        {intlText.SELECT_TITLE}
      </Text>
      <Text variant="large" block>
        {intlText.SELECT_DESCRIPTION}
      </Text>
      <SearchableDropdown
        label={intlText.SELECTION_SUBSCRIPTION}
        options={subscriptions}
        placeholder={subscriptionPlaceholder}
        disabled={isSubscriptionsLoading || !subscriptions.length}
        onChange={onChangeSubscriptions}
        selectedKey={selectedSubscription !== '' ? selectedSubscription : null}
        className="msla-export-instance-panel-dropdown"
        isLoading={subscriptionLoading}
        searchBoxPlaceholder={intlText.SEARCH_SUBSCRIPTION}
      />
      <SearchableDropdown
        label={intlText.SELECTION_LOCATION}
        options={locations}
        placeholder={isePlaceholder}
        disabled={
          isSubscriptionsLoading ||
          isIseLoading ||
          isRegionLoading ||
          isEmptyString(selectedSubscription) ||
          !(ise.length || regions.length)
        }
        onChange={onChangeLocation}
        selectedKey={selectedIse !== '' ? `ise:${selectedIse}` : location ? `region:${location}` : null}
        className="msla-export-instance-panel-dropdown"
        isLoading={iseLoading}
        searchBoxPlaceholder={intlText.SEARCH_LOCATION}
      />
    </div>
  );
};
