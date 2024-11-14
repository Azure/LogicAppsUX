import { environment } from '../../../../environments/environment';
import { useQuery } from '@tanstack/react-query';
import type { AppDispatch } from '../../../state/store';
import { useAppId, useIsMonitoringView, useRunId, useWorkflowName } from '../../../state/workflowLoadingSelectors';
import { changeRunId, setAppid, setResourcePath } from '../../../state/workflowLoadingSlice';
import { useFetchConsumptionApps } from '../Queries/FetchConsumptionApps';
import type { IComboBoxOption, IStackProps, IComboBoxStyles, IDropdownOption } from '@fluentui/react';
import { ComboBox, Dropdown, Spinner, Stack } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import type { RunList } from '../Models/WorkflowListTypes';

const columnProps: Partial<IStackProps> = {
  tokens: { childrenGap: 15 },
};
const comboBoxStyles: Partial<IComboBoxStyles> = {
  callout: { maxWidth: '90vw' },
};

const resourceIdValidation =
  /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;

export const AzureConsumptionLogicAppSelector = () => {
  const { data: appList, isLoading: isAppsLoading } = useFetchConsumptionApps();
  const dispatch = useDispatch<AppDispatch>();

  const appId = useAppId();
  const validApp = appId ? resourceIdValidation.test(appId) : false;
  const workflowName = useWorkflowName();
  const runId = useRunId();
  const isMonitoringView = useIsMonitoringView();

  const [selectedSiteResourceId, setSelectedSiteResourceId] = useState<string | undefined>(undefined);

  const filteredAppList = useMemo(() => {
    if (selectedSiteResourceId) {
      const updatedFilteredAppList = appList?.filter((app) => app.id.startsWith(selectedSiteResourceId)) ?? [];
      const firstResource = updatedFilteredAppList?.[0];
      if (firstResource) {
        dispatch(setAppid(firstResource.id));
        dispatch(setResourcePath(firstResource.id));
      }
      return updatedFilteredAppList;
    }
    return appList;
  }, [dispatch, appList, selectedSiteResourceId]);

  const siteResourceIdOptions: IComboBoxOption[] =
    Array.from(new Set(appList?.map((app) => app.id.split('/providers')[0]) ?? []))?.map((siteResourceId) => ({
      key: siteResourceId,
      text: `${siteResourceId.split('/')?.slice(-1)} (${siteResourceId})`,
    })) ?? [];

  const appOptions: IComboBoxOption[] =
    filteredAppList?.map((app) => {
      return {
        key: app.id,
        text: `${app.name} (${app.id})`,
        data: app,
      };
    }) ?? [];

  const {
    data: runInstances,
    isLoading: isRunInstancesLoading,
    refetch: reloadRunIds,
  } = useQuery(
    ['getListOfRunInstances', appId, workflowName],
    async () => {
      if (!validApp) {
        return null;
      }
      const results = await axios.get<RunList>(`https://management.azure.com${appId}/runs?api-version=2016-10-01`, {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
        },
      });
      return results.data;
    },
    { enabled: !!workflowName && !!isMonitoringView }
  );

  useEffect(() => {
    if (runId && !runInstances?.value?.some((runInstance) => runInstance.name === runId)) {
      reloadRunIds();
    }
  }, [reloadRunIds, runId, runInstances?.value]);

  const runOptions =
    runInstances?.value
      ?.map<IDropdownOption>((runInstance) => ({
        key: runInstance.name ?? '',
        text: `${runInstance.name} (${runInstance.properties.status})`,
      }))
      .sort((a, b) => a.text.localeCompare(b.text)) ?? [];

  return (
    <Stack {...columnProps}>
      <div style={{ position: 'relative' }}>
        <ComboBox
          placeholder={
            isAppsLoading ? '' : siteResourceIdOptions.length > 0 ? 'Filter Workflows by Site Resource Id' : 'No Resource Ids to Select'
          }
          label="(Optional) Filter Workflows by Site Resource Id"
          allowFreeform={true}
          autoComplete={'on'}
          options={siteResourceIdOptions}
          selectedKey={workflowName}
          disabled={siteResourceIdOptions.length === 0 || isAppsLoading}
          onChange={(_, option) => {
            const selectedAppId = (option?.key ?? '') as string;
            setSelectedSiteResourceId(selectedAppId);
          }}
        />
        {isAppsLoading ? (
          <Spinner style={{ position: 'absolute', bottom: '6px', left: '8px' }} labelPosition="right" label="Loading Workflows..." />
        ) : null}
      </div>
      <div style={{ position: 'relative' }}>
        <ComboBox
          placeholder={isAppsLoading ? '' : appOptions.length > 0 ? 'Select an App' : 'No Apps to Select'}
          label="Consumption Logic Apps"
          allowFreeform={true}
          autoComplete={'on'}
          selectedKey={appId}
          options={appOptions}
          onChange={(_, option) => {
            const selectedAppId = (option?.key ?? '') as string;
            if (!selectedAppId) {
              return;
            }
            dispatch(setAppid(selectedAppId));
            dispatch(setResourcePath(selectedAppId));
          }}
          styles={comboBoxStyles}
          disabled={appOptions.length === 0 || isAppsLoading}
        />
        {isAppsLoading ? (
          <Spinner
            style={{ position: 'absolute', bottom: '6px', left: '8px' }}
            labelPosition="right"
            label="Loading Consumption Logic Apps..."
          />
        ) : null}
      </div>
      {isMonitoringView ? (
        <div style={{ position: 'relative' }}>
          <Dropdown
            placeholder={
              isRunInstancesLoading
                ? ''
                : appId
                  ? runOptions.length > 0
                    ? 'Select a Run Instance'
                    : 'No Run Instances to Select'
                  : 'Select a Logic App first'
            }
            label="RunInstance"
            options={runOptions}
            selectedKey={runId}
            disabled={runOptions.length === 0 || !appId || isRunInstancesLoading}
            defaultValue={runId}
            onChange={(_, option) => {
              dispatch(changeRunId(option?.key as string));
            }}
          />
          {isRunInstancesLoading ? (
            <Spinner style={{ position: 'absolute', bottom: '6px', left: '8px' }} labelPosition="right" label="Loading Run Instances..." />
          ) : null}
        </div>
      ) : null}
    </Stack>
  );
};
