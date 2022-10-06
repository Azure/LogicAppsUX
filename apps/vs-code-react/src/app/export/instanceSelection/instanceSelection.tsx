import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedLocation, updateSelectedSubscripton } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { getDropdownPlaceholder, parseIseData, parseRegionData, parseSubscriptionsData } from './helper';
import { Text, DropdownMenuItemType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const InstanceSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
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
    });
  }, [accessToken, baseUrl]);

  const loadSubscriptions = () => {
    return apiService.getSubscriptions();
  };

  const loadIse = () => {
    return apiService.getIse(selectedSubscription);
  };

  const loadRegion = () => {
    return apiService.getRegions(selectedSubscription);
  };

  const { data: subscriptionsData, isLoading: isSubscriptionsLoading } = useQuery<any>(QueryKeys.subscriptionData, loadSubscriptions, {
    refetchOnWindowFocus: false,
    enabled: accessToken !== undefined,
    retry: 4,
  });

  const {
    data: regionData,
    isLoading: isRegionLoading,
    refetch: refetchRegion,
  } = useQuery<any>([QueryKeys.regionData, { subscriptionId: selectedSubscription }], loadRegion, {
    refetchOnWindowFocus: false,
    enabled: selectedSubscription !== '',
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
      refetchRegion();
    }
  };

  const onChangeLocation = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      console.log(JSON.stringify(selectedOption));
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

  const subscriptions: IDropdownOption[] = isSubscriptionsLoading || !subscriptionsData ? [] : parseSubscriptionsData(subscriptionsData);

  const ise: IDropdownOption[] = selectedSubscription !== '' && !isIseLoading && iseData ? parseIseData(iseData) : [];
  const regions: IDropdownOption[] = selectedSubscription !== '' && !isRegionLoading && regionData ? parseRegionData(regionData) : [];

  const locations: IDropdownOption[] = [
    { key: 'divider:ise', text: intlText.DIVIDER_ISE, itemType: DropdownMenuItemType.Divider },
    { key: 'header:ise', text: intlText.DIVIDER_ISE, itemType: DropdownMenuItemType.Header },
    ...ise,
    { key: 'divider:regions', text: intlText.DIVIDER_REGIONS, itemType: DropdownMenuItemType.Divider },
    { key: 'header:regions', text: intlText.DIVIDER_REGIONS, itemType: DropdownMenuItemType.Header },
    ...regions,
  ];

  const subscriptionLoading = accessToken === undefined ? true : isSubscriptionsLoading;
  const subscriptionPlaceholder = getDropdownPlaceholder(
    subscriptionLoading,
    subscriptions.length,
    intlText.SELECT_OPTION,
    intlText.EMPTY_SUBSCRIPTION,
    intlText.LOADING
  );

  const iseLoading = selectedSubscription === '' ? false : isIseLoading;
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
          isSubscriptionsLoading || isIseLoading || isRegionLoading || selectedSubscription === '' || !(ise.length || regions.length)
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
