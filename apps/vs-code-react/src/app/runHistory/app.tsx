import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { InitRunService, StandardRunService } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, HttpClient } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRunHistoryStyles } from './runHistoryStyles';
import { RunHistoryPanelInstance } from '@microsoft/logic-apps-designer-v2';
import type { OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';
import { Dropdown, Option, Title1, useId } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface CallbackInfo {
  method?: string;
  value: string;
}
export const RunHistoryApp = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const vscode = useContext(VSCodeContext);
  const styles = useRunHistoryStyles();
  const dropdownId = useId('dropdown-workflows');
  const intl = useIntl();
  const { workflowNames } = workflowState;
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  const onOptionSelect = (_ev: SelectionEvents, data: OptionOnSelectData) => {
    setSelectedWorkflow(data.optionText ?? '');
  };

  useEffect(() => {
    if (workflowNames && workflowNames?.length > 0) {
      setSelectedWorkflow(workflowNames[0]);
    }
  }, [workflowNames]);

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
      workflowName: selectedWorkflow,
      httpClient,
    });
  }, [workflowState.accessToken, workflowState.baseUrl, workflowState.hostVersion, workflowState.apiVersion, selectedWorkflow]);

  useEffect(() => {
    InitRunService(runService);
  }, [runService]);

  const handleRunSelected = (runId: string) => {
    vscode.postMessage({
      command: ExtensionCommand.loadRun,
      item: { id: runId },
    });
  };

  return (
    <div className={styles.runHistoryContainer}>
      <Title1 className={styles.runHistoryTitle}>{intlText.RUN_HISTORY_TITLE}</Title1>
      <div className={styles.workflowDropdown}>
        <label htmlFor={dropdownId}>{intlText.WORKFLOW}</label>
        <Dropdown id={dropdownId} placeholder={intlText.DROPDOWN_PLACEHOLDER} value={selectedWorkflow} onOptionSelect={onOptionSelect}>
          {workflowNames?.map((workflow) => (
            <Option key={workflow}>{workflow}</Option>
          ))}
        </Dropdown>
      </div>
      <RunHistoryPanelInstance onRunSelected={handleRunSelected} />
    </div>
  );
};
