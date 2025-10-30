/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Option, Text, Field, Input, Label, Dropdown } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import { useState } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import { setWorkflowType, setWorkflowName } from '../../../state/createWorkspaceSlice';
import { useSelector, useDispatch } from 'react-redux';
import { validateWorkflowName } from '../utils/validation';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { useIntlMessages, workspaceMessages } from '../../../intl';

export const WorkflowTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace);
  const { workflowType, workflowName, logicAppType } = createWorkspaceState;

  // Validation state
  const [workflowNameError, setWorkflowNameError] = useState<string | undefined>(undefined);

  const intlText = useIntlMessages(workspaceMessages);

  const handleWorkflowTypeChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setWorkflowType(data.optionValue));
    }
  };

  const handleWorkflowNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWorkflowName(event.target.value));
    setWorkflowNameError(validateWorkflowName(event.target.value, intlText));
  };

  const supportsStateless = logicAppType !== ProjectType.agentCodeful;

  console.log('charlie', supportsStateless, logicAppType);

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
          value={
            workflowType === 'Stateful-Codeless'
              ? 'Stateful'
              : workflowType === 'Stateless-Codeless'
                ? 'Stateless'
                : workflowType === 'Agentic-Codeless'
                  ? 'Autonomous Agents (Preview)'
                  : workflowType === 'Agent-Codeless'
                    ? 'Conversational Agents (Preview)'
                    : ''
          }
          selectedOptions={workflowType ? [workflowType] : []}
          onOptionSelect={handleWorkflowTypeChange}
          placeholder={intlText.SELECT_WORKFLOW_TYPE}
          className={styles.inputControl}
        >
          <Option value="Stateful-Codeless" text="Stateful">
            {intlText.STATEFUL_TITLE}
          </Option>
          {supportsStateless ? (
            <Option value="Stateless-Codeless" text="Stateless">
              {intlText.STATELESS_TITLE}
            </Option>
          ) : null}
          <Option value="Agentic-Codeless" text="Autonomous Agents (Preview)">
            {intlText.AUTONOMOUS_TITLE}
          </Option>
          <Option value="Agent-Codeless" text="Conversational Agents">
            {intlText.AGENT_TITLE}
          </Option>
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
            {workflowType === 'Stateful-Codeless' && intlText.STATEFUL_DESCRIPTION}
            {workflowType === 'Stateless-Codeless' && intlText.STATELESS_DESCRIPTION}
            {workflowType === 'Agentic-Codeless' && intlText.AUTONOMOUS_DESCRIPTION}
            {workflowType === 'Agent-Codeless' && intlText.AGENT_DESCRIPTION}
          </Text>
        )}
      </Field>
    </div>
  );
};
