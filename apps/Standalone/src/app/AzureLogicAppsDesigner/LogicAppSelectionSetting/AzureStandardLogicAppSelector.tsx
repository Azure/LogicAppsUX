import { environment } from '../../../environments/environment';
import type { AppDispatch } from '../../../state/store';
import { useAppId, useIsMonitoringView, useRunId, useWorkflowName } from '../../../state/workflowLoadingSelectors';
import { setAppid, setResourcePath, changeRunId, setWorkflowName } from '../../../state/workflowLoadingSlice';
import type { WorkflowList, RunList } from '../Models/WorkflowListTypes';
import { useFetchStandardApps } from '../Queries/FetchStandardApps';
import type { IComboBoxOption, IDropdownOption, IStackProps, IComboBoxStyles } from '@fluentui/react';
import { ComboBox, Dropdown, Spinner, Stack } from '@fluentui/react';
import axios from 'axios';
import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

const columnProps: Partial<IStackProps> = {
  tokens: { childrenGap: 15 },
};
const comboBoxStyles: Partial<IComboBoxStyles> = {
  callout: { maxWidth: '90vw' },
};
const resourceIdValidation =
  /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;

export const AzureStandardLogicAppSelector = () => {
  const appId = useAppId();
  const workflowName = useWorkflowName();
  const runId = useRunId();
  const isMonitoringView = useIsMonitoringView();
  const { data: appList, isLoading: isAppsLoading } = useFetchStandardApps();
  const validApp = appId ? resourceIdValidation.test(appId) : false;
  const dispatch = useDispatch<AppDispatch>();

  const { data: workflows, isLoading: isWorkflowsLoading } = useQuery(['getListOfWorkflows', appId], async () => {
    if (!validApp) return null;
    const results = await axios.get<WorkflowList>(`https://management.azure.com${appId}/workflows?api-version=2018-11-01`, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    return results.data;
  });

  const {
    data: runInstances,
    isLoading: isRunInstancesLoading,
    refetch: reloadRunIds,
  } = useQuery(
    ['getListOfRunInstances', appId, workflowName],
    async () => {
      if (!validApp) return null;
      const results = await axios.get<RunList>(
        `https://management.azure.com${appId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/runs?api-version=2018-11-01`,
        {
          headers: {
            Authorization: `Bearer ${environment.armToken}`,
          },
        }
      );
      return results.data;
    },
    { enabled: !!workflowName && !!isMonitoringView }
  );

  useEffect(() => {
    if (runId && !runInstances?.value?.some((runInstance) => runInstance.name === runId)) {
      reloadRunIds();
    }
  }, [reloadRunIds, runId, runInstances?.value]);
  const appOptions: IComboBoxOption[] =
    appList?.map((app) => {
      return {
        key: app.id,
        text: `${app.name} (${app.id})`,
      };
    }) ?? [];

  const workflowOptions =
    workflows?.value
      ?.map<IDropdownOption>((workflow) => {
        const name = workflow.name?.split('/')[1];
        return {
          key: name ?? '',
          text: name ?? '',
        };
      })
      .sort((a, b) => a.text.localeCompare(b.text)) ?? [];

  const runOptions =
    runInstances?.value
      ?.map<IDropdownOption>((runInstance) => {
        return {
          key: runInstance.name ?? '',
          text: `${runInstance.name} (${runInstance.properties.status})`,
        };
      })
      .sort((a, b) => a.text.localeCompare(b.text)) ?? [];

  return (
    <Stack {...columnProps}>
      <div style={{ position: 'relative' }}>
        <ComboBox
          placeholder={!isAppsLoading ? (appOptions.length > 0 ? 'Select an App' : 'No Apps to Select') : ''}
          label="Standard Logic Apps"
          allowFreeform={true}
          autoComplete={'on'}
          selectedKey={appId}
          options={appOptions}
          onChange={(_, option) => {
            dispatch(setAppid((option?.key ?? '') as string));
          }}
          styles={comboBoxStyles}
          disabled={appOptions.length === 0 || isAppsLoading}
        />
        {isAppsLoading ? (
          <Spinner
            style={{ position: 'absolute', bottom: '6px', left: '8px' }}
            labelPosition="right"
            label="Loading Standard Logic Apps..."
          />
        ) : null}
      </div>
      <div style={{ position: 'relative' }}>
        <Dropdown
          placeholder={
            !isWorkflowsLoading
              ? appId
                ? workflowOptions.length > 0
                  ? 'Select a Workflow'
                  : 'No Workflows to Select'
                : 'Select a Logic App First'
              : ''
          }
          label="Workflow"
          options={workflowOptions}
          selectedKey={workflowName}
          disabled={workflowOptions.length === 0 || !appId || isWorkflowsLoading}
          defaultValue={workflowName}
          onChange={(_, option) => {
            dispatch(setResourcePath(`${appId}/workflows/${option?.key}`));
            dispatch(setWorkflowName(option?.key as string));
          }}
        />
        {isWorkflowsLoading ? (
          <Spinner style={{ position: 'absolute', bottom: '6px', left: '8px' }} labelPosition="right" label="Loading Workflows..." />
        ) : null}
      </div>
      {isMonitoringView ? (
        <div style={{ position: 'relative' }}>
          <Dropdown
            placeholder={
              !isRunInstancesLoading
                ? appId
                  ? runOptions.length > 0
                    ? 'Select a Run Instance'
                    : 'No Run Instances to Select'
                  : 'Select a Workflow First'
                : ''
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
