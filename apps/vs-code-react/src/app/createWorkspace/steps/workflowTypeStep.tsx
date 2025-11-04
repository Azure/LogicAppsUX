/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Option, Text, Field, Input, Label, Dropdown } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import { setWorkflowType, setWorkflowName } from '../../../state/createWorkspaceSlice';
import { useSelector, useDispatch } from 'react-redux';
import { validateWorkflowName } from '../utils/validation';
import { ProjectType, WorkflowType } from '@microsoft/vscode-extension-logic-apps';
import { useIntlMessages, workspaceMessages } from '../../../intl';

const logicAppCodeTypes = {
  CODELESS: 'CODELESS',
  CODEFUL: 'CODEFUL',
};

export const WorkflowTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace);
  const { workflowType, workflowName, logicAppType } = createWorkspaceState;
  const intlText = useIntlMessages(workspaceMessages);

  // Validation state
  const [workflowNameError, setWorkflowNameError] = useState<string | undefined>(undefined);

  const handleWorkflowTypeChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setWorkflowType(data.optionValue));
    }
  };

  const workflowTypes: Record<string, any> = useMemo(() => {
    return {
      [logicAppCodeTypes.CODELESS]: {
        [WorkflowType.stateful]: intlText.STATEFUL_TITLE,
        [WorkflowType.stateless]: intlText.STATELESS_TITLE,
        [WorkflowType.agentic]: intlText.AUTONOMOUS_TITLE,
        [WorkflowType.agent]: intlText.AGENT_TITLE,
      },
      [logicAppCodeTypes.CODEFUL]: {
        [WorkflowType.statefulCodeful]: intlText.STATEFUL_TITLE,
        [WorkflowType.agentic]: intlText.AUTONOMOUS_TITLE,
        [WorkflowType.agentCodeful]: intlText.AGENT_TITLE,
      },
    };
  }, [intlText]);

  const handleWorkflowNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWorkflowName(event.target.value));
    setWorkflowNameError(validateWorkflowName(event.target.value, intlText));
  };

  const selectWorkflowTypes = useMemo(() => {
    const logicAppCodeType = logicAppType === ProjectType.agentCodeful ? logicAppCodeTypes.CODEFUL : logicAppCodeTypes.CODELESS;
    return workflowTypes[logicAppCodeType];
  }, [logicAppType, workflowTypes]);

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.WORKFLOW_CONFIGURATION}</Text>
      <Field
        label={intlText.WORKFLOW_NAME}
        className={styles.workflowNameField}
        required
        validationState={workflowNameError ? 'error' : undefined}
        validationMessage={workflowNameError}
      >
        <Input
          value={workflowName}
          onChange={handleWorkflowNameChange}
          placeholder={intlText.ENTER_WORKFLOW_NAME}
          className={styles.inputControl}
        />
      </Field>
      <Field required>
        <Label required>{intlText.WORKFLOW_TYPE}</Label>
        <Dropdown
          value={workflowTypes[workflowType]}
          selectedOptions={workflowType ? [workflowType] : []}
          onOptionSelect={handleWorkflowTypeChange}
          placeholder={intlText.SELECT_WORKFLOW_TYPE}
          className={styles.inputControl}
        >
          {Object.keys(selectWorkflowTypes).map((optionKey, index) => {
            const optionText = selectWorkflowTypes[optionKey];
            return (
              <Option value={optionKey} key={`${optionText}-${index}`} text={optionText}>
                {optionText}
              </Option>
            );
          })}
        </Dropdown>
        {workflowType && (
          <Text
            size={200}
            style={{
              color: 'var(--colorNeutralForeground2)',
              marginTop: '4px',
              display: 'block',
            }}
          >
            {workflowTypes[workflowType]}
          </Text>
        )}
      </Field>
    </div>
  );
};
