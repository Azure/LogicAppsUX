import type { RootState } from '../../state/store';
import { InitRunService, StandardRunService } from '@microsoft/logic-apps-shared';
import { HttpClient } from '@microsoft/vscode-extension-logic-apps';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRunHistoryStyles } from './runHistoryStyles';
import { RunHistoryPanelInstance } from '@microsoft/logic-apps-designer-v2';
import { Dropdown, Option, useId } from '@fluentui/react-components';

export interface CallbackInfo {
  method?: string;
  value: string;
}
export const RunHistoryApp = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const styles = useRunHistoryStyles();
  const dropdownId = useId('dropdown-default');

  const options = ['Cat', 'Caterpillar', 'Corgi', 'Chupacabra', 'Dog', 'Ferret', 'Fish', 'Fox', 'Hamster', 'Snake'];

  const runService = useMemo(() => {
    const httpClient = new HttpClient({
      accessToken: workflowState.accessToken,
      baseUrl: workflowState.baseUrl,
      apiHubBaseUrl: '',
      hostVersion: workflowState.hostVersion,
    });

    return new StandardRunService({
      baseUrl: workflowState.baseUrl,
      apiVersion: workflowState.apiVersion,
      workflowName: workflowState.workflowProperties.name,
      httpClient,
    });
  }, [
    workflowState.baseUrl,
    workflowState.apiVersion,
    workflowState.accessToken,
    workflowState.workflowProperties.name,
    workflowState.hostVersion,
  ]);

  useEffect(() => {
    InitRunService(runService);
  }, [runService]);

  return (
    <div className={styles.overviewContainer}>
      <div>
        <label htmlFor={dropdownId}>Best pet</label>
        <Dropdown id={dropdownId} placeholder="Select an animal">
          {options.map((option) => (
            <Option key={option} disabled={option === 'Ferret'}>
              {option}
            </Option>
          ))}
        </Dropdown>
      </div>
      <RunHistoryPanelInstance />
    </div>
  );
};
