import { type ISubscription, QueryKeys, type IIse, type IRegion } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateSelectedLocation, updateSelectedSubscripton } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { SearchableDropdown, type IDropdownOption, DropdownMenuItemType } from '../../components/searchableDropdown';
import { getDropdownPlaceholder, parseIseList, parseRegionList, parseSubscriptionsList } from './helper';
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { useContext, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { useExportStyles } from '../exportStyles';

export const InstanceSelection: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, selectedIse, location } = exportData;
  const styles = useExportStyles();
  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    DIVIDER_REGIONS: intl.formatMessage({
      defaultMessage: 'Regions',
      id: 'w+aIAc',
      description: 'Divider title for azure regions',
    }),
    DIVIDER_ISE: intl.formatMessage({
      defaultMessage: 'Integration service environments',
      id: 'BbQXF+',
      description: 'Divider title for ISE',
    }),
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic app instance',
      id: 'aIgACb',
      description: 'Select logic app instance title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      id: 'rQtQpJ',
      description: 'Select apps to export description',
    }),
    SELECTION_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Select a subscription',
      id: '4fP2Ko',
      description: 'Select a subscription',
    }),
    SELECTION_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a region or an integration service environment (ISE) instance',
      id: 'e7LAHT',
      description: 'Select a region or an ISE instance',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      id: '//Icb/',
      description: 'Select an option placeholder',
    }),
    EMPTY_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'No subscriptions available',
      id: 'bUIrND',
      description: 'No subscriptions available',
    }),
    EMPTY_LOCATION: intl.formatMessage({
      defaultMessage: 'No regions and integration service environment (ISE) instances available',
      id: 'xxZDTu',
      description: 'No regions and ISE instances available text',
    }),
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading...',
      id: '2EZWf6',
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
    <div>
      <XLargeText text={intlText.SELECT_TITLE} style={{ display: 'block' }} />
      <LargeText text={intlText.SELECT_DESCRIPTION} style={{ display: 'block' }} />
      <SearchableDropdown
        label={intlText.SELECTION_SUBSCRIPTION}
        options={subscriptions}
        placeholder={subscriptionPlaceholder}
        disabled={isSubscriptionsLoading || !subscriptions.length}
        onChange={onChangeSubscriptions}
        selectedKey={selectedSubscription !== '' ? selectedSubscription : undefined}
        className={styles.instancePanelDropdown}
        isLoading={subscriptionLoading}
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
        selectedKey={selectedIse !== '' ? `ise:${selectedIse}` : location ? `region:${location}` : undefined}
        className={styles.instancePanelDropdown}
        isLoading={iseLoading}
      />
    </div>
  );
};
