import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../../state/store';
import { changeAppid, changeResourcePath, changeRunId, changeWorkflowName } from '../../../state/workflowLoadingSlice';
import type { WorkflowList, RunList } from '../Models/WorkflowListTypes';
import { useFetchStandardApps } from '../Queries/FetchStandardApps';
import type { IComboBoxOption, IDropdownOption, IStackProps, IComboBoxStyles } from '@fluentui/react';
import { ComboBox, Dropdown, Stack } from '@fluentui/react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const columnProps: Partial<IStackProps> = {
  tokens: { childrenGap: 15 },
};
const comboBoxStyles: Partial<IComboBoxStyles> = {
  callout: { maxWidth: '90vw' },
};
const resourceIdValidation =
  /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;

export const LogicAppSelector = () => {
  const { appId, workflowName, runId, monitoringView } = useSelector((state: RootState) => state.workflowLoader);
  const { data: appList } = useFetchStandardApps();
  const validApp = appId ? resourceIdValidation.test(appId) : false;
  const dispatch = useDispatch<AppDispatch>();

  const { data: workflows } = useQuery(['getListOfWorkflows', appId], async () => {
    if (!validApp) return null;
    const results = await axios.get<WorkflowList>(`https://management.azure.com${appId}/workflows?api-version=2018-11-01`, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    return results.data;
  });

  const { data: runInstances } = useQuery(
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
    { enabled: !!workflowName && !!monitoringView }
  );
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
      <ComboBox
        label="Logic Apps"
        allowFreeform={true}
        autoComplete={'on'}
        selectedKey={appId}
        options={appOptions}
        onChange={(_, option) => {
          dispatch(changeAppid((option?.key ?? '') as string));
        }}
        styles={comboBoxStyles}
      />
      <Dropdown
        placeholder={appId ? (workflowOptions.length > 0 ? 'Select a Workflow' : 'No Workflows to Select') : 'Select a Logic App First'}
        label="Workflow"
        options={workflowOptions}
        selectedKey={workflowName}
        disabled={workflowOptions.length === 0 || !appId}
        defaultValue={workflowName}
        onChange={(_, option) => {
          dispatch(changeResourcePath(`${appId}/workflows/${option?.key}`));
          dispatch(changeWorkflowName(option?.key as string));
        }}
      />
      {monitoringView ? (
        <Dropdown
          placeholder={appId ? (runOptions.length > 0 ? 'Select a Run Instance' : 'No Run Instances to Select') : 'Select a Workflow First'}
          label="RunInstance"
          options={runOptions}
          selectedKey={runId}
          disabled={runOptions.length === 0 || !appId}
          defaultValue={runId}
          onChange={(_, option) => {
            dispatch(changeRunId(option?.key as string));
          }}
        />
      ) : null}
    </Stack>
  );
};
