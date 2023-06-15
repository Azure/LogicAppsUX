import type { AppDispatch } from '../../../state/store';
import { useAppId } from '../../../state/workflowLoadingSelectors';
import { changeAppid, changeResourcePath, changeWorkflowName } from '../../../state/workflowLoadingSlice';
import { useFetchConsumptionApps } from '../Queries/FetchConsumptionApps';
import type { IComboBoxOption, IStackProps, IComboBoxStyles } from '@fluentui/react';
import { ComboBox, Spinner, Stack } from '@fluentui/react';
import { useDispatch } from 'react-redux';

const columnProps: Partial<IStackProps> = {
  tokens: { childrenGap: 15 },
};
const comboBoxStyles: Partial<IComboBoxStyles> = {
  callout: { maxWidth: '90vw' },
};
// const resourceIdValidation = /^\/subscriptions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/resourceGroups\/[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?\/providers\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+$/;

export const AzureConsumptionLogicAppSelector = () => {
  const { data: appList, isLoading: isAppsLoading } = useFetchConsumptionApps();
  const dispatch = useDispatch<AppDispatch>();

  const appId = useAppId();
  const appOptions: IComboBoxOption[] =
    appList?.map((app) => {
      return {
        key: app.id,
        text: `${app.name} (${app.id})`,
        data: app,
      };
    }) ?? [];

  return (
    <Stack {...columnProps}>
      <div style={{ position: 'relative' }}>
        <ComboBox
          placeholder={!isAppsLoading ? (appOptions.length > 0 ? 'Select an App' : 'No Apps to Select') : ''}
          label="Consumption Logic Apps"
          allowFreeform={true}
          autoComplete={'on'}
          selectedKey={appId}
          options={appOptions}
          onChange={(_, option) => {
            const selectedAppId = (option?.key ?? '') as string;
            if (!selectedAppId) return;
            dispatch(changeAppid(selectedAppId));
            dispatch(changeResourcePath(selectedAppId));
            dispatch(changeWorkflowName(option?.data.name as string));
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
    </Stack>
  );
};
