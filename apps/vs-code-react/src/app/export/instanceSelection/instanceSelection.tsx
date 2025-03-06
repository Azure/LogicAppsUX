import { type ISubscription, QueryKeys, type IIse, type IRegion } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateSelectedLocation, updateSelectedSubscripton } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { getDropdownPlaceholder, parseIseList, parseRegionList, parseSubscriptionsList } from './helper';
import { DropdownMenuItemType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { useContext, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';

export const InstanceSelection: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, selectedIse, location } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    DIVIDER_REGIONS: intl.formatMessage({
      defaultMessage: 'Regions',
      id: 'msc3e68801c770',
      description: 'Divider title for azure regions',
    }),
    DIVIDER_ISE: intl.formatMessage({
      defaultMessage: 'Integration service environments',
      id: 'ms05b41717e8be',
      description: 'Divider title for ISE',
    }),
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic app instance',
      id: 'ms68880009b6c5',
      description: 'Select logic app instance title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      id: 'msad0b50a49adf',
      description: 'Select apps to export description',
    }),
    SELECTION_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Select a subscription',
      id: 'mse1f3f62a8e94',
      description: 'Select a subscription',
    }),
    SELECTION_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a region or an integration service environment (ISE) instance',
      id: 'ms7bb2c01d3a97',
      description: 'Select a region or an ISE instance',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      id: 'msfff21c6ff1c2',
      description: 'Select an option placeholder',
    }),
    EMPTY_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'No subscriptions available',
      id: 'ms6d422b343023',
      description: 'No subscriptions available',
    }),
    EMPTY_LOCATION: intl.formatMessage({
      defaultMessage: 'No regions and integration service environment (ISE) instances available',
      id: 'msc716434eea2f',
      description: 'No regions and ISE instances available text',
    }),
    SEARCH_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Find and select subscription',
      id: 'ms6c63dc453223',
      description: 'Find and select subscription text',
    }),
    SEARCH_LOCATION: intl.formatMessage({
      defaultMessage: 'Find and select region or integration service environment (ISE)',
      id: 'ms801453139884',
      description: 'Find region or ISE text',
    }),
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading...',
      id: 'msd846567fa875',
      description: 'Loading text',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const loadSubscriptions = () => {
    return apiService.getSubscriptions();
  };

  const loadIse = () => {
    return apiService.getIse(selectedSubscription);
  };

  const loadRegion = () => {
    return apiService.getRegions(selectedSubscription);
  };

  const { data: subscriptionsList, isLoading: isSubscriptionsLoading } = useQuery<ISubscription[]>(
    [QueryKeys.subscriptionData],
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
  } = useQuery<IRegion[]>([QueryKeys.regionData, { subscriptionId: selectedSubscription }], loadRegion, {
    refetchOnWindowFocus: false,
    enabled: !isEmptyString(selectedSubscription),
    retry: 4,
  });

  const {
    data: iseList,
    isLoading: isIseLoading,
    refetch: refetchIse,
  } = useQuery<IIse[]>([QueryKeys.iseData, { subscriptionId: selectedSubscription }], loadIse, {
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
      <XLargeText text={intlText.SELECT_TITLE} style={{ display: 'block' }} />
      <LargeText text={intlText.SELECT_DESCRIPTION} style={{ display: 'block' }} />
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
