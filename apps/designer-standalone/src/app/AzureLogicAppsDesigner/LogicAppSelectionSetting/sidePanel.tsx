import { environment } from '../../../environments/environment';
import type { AppDispatch, RootState } from '../../../state/store';
import { changeAppid, changeResourcePath, changeWorkflowName } from '../../../state/workflowLoadingSlice';
import type { WorkflowList } from '../Models/WorkflowListTypes';
import type { IDropdownOption, IStackProps } from '@fluentui/react';
import { Dropdown, Stack, TextField } from '@fluentui/react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const columnProps: Partial<IStackProps> = {
  tokens: { childrenGap: 15 },
};
const resourceIdValidation =
  /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;
export const LogicAppSelector = () => {
  const { appId, workflowName } = useSelector((state: RootState) => state.workflowLoader);
  const validApp = appId ? resourceIdValidation.test(appId) : false;
  const dispatch = useDispatch<AppDispatch>();
  const { data: workflows } = useQuery(['getListOfWorkflows', validApp], async () => {
    if (!validApp) return null;
    const results = await axios.get<WorkflowList>(`https://management.azure.com${appId}/workflows?api-version=2018-11-01`, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    return results.data;
  });
  const options =
    workflows?.value?.map<IDropdownOption>((workflow) => {
      const name = workflow.name?.split('/')[1];
      return {
        key: name ?? '',
        text: name ?? '',
      };
    }) ?? [];
  return (
    <Stack {...columnProps}>
      <TextField
        label="Logic App ID"
        value={appId ?? ''}
        placeholder="/subscriptions/<sid>>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<appName>"
        onChange={(_, newValue) => dispatch(changeAppid(newValue ?? ''))}
      />
      <Dropdown
        placeholder="Select a workflow"
        label="Workflow"
        options={options}
        defaultValue={workflowName}
        onChange={(_, option) => {
          dispatch(changeResourcePath(`${appId}/workflows/${option?.key}`));
          dispatch(changeWorkflowName(option?.key as string));
        }}
      />
    </Stack>
  );
};
