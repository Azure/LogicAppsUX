import type { RootState } from '../../state/store';
import { InitRunService, StandardRunService } from '@microsoft/logic-apps-shared';
import { HttpClient } from '@microsoft/vscode-extension-logic-apps';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRunHistoryStyles } from './runHistoryStyles';
import { RunHistoryPanelInstance } from '@microsoft/logic-apps-designer-v2';
import { Dropdown, Option, Title1, useId } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface CallbackInfo {
  method?: string;
  value: string;
}
export const RunHistoryApp = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const styles = useRunHistoryStyles();
  const dropdownId = useId('dropdown-workflows');
  const intl = useIntl();

  const intlText = {
    RUN_HISTORY_TITLE: intl.formatMessage({
      defaultMessage: 'Run history',
      id: 'q/i13s',
      description: 'Text for run history title',
    }),
    WORKFLOW: intl.formatMessage({
      defaultMessage: 'Workflow',
      id: 'lW2CUD',
      description: 'Text for workflow label',
    }),
    DROPDOWN_PLACEHOLDER: intl.formatMessage({
      defaultMessage: 'Select a workflow',
      id: 'zbBPqf',
      description: 'Text for workflow dropdown placeholder',
    }),
  };

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
    <div className={styles.runHistoryContainer}>
      <Title1>{intlText.RUN_HISTORY_TITLE}</Title1>
      <div className={styles.workflowDropdown}>
        <label htmlFor={dropdownId}>{intlText.WORKFLOW}</label>
        <Dropdown id={dropdownId} placeholder={intlText.DROPDOWN_PLACEHOLDER}>
          {options.map((option) => (
            <Option key={option}>{option}</Option>
          ))}
        </Dropdown>
      </div>
      <RunHistoryPanelInstance />
    </div>
  );
};
