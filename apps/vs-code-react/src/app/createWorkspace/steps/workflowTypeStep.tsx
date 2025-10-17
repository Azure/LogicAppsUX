/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Option, Text, Field, Input, Label, Dropdown } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import { useState } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { setWorkflowType, setWorkflowName } from '../../../state/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { validateWorkflowName } from '../validation/helper';

export const WorkflowTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { workflowType, workflowName } = createWorkspaceState;

  // Validation state
  const [workflowNameError, setWorkflowNameError] = useState<string | undefined>(undefined);

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Workflow Configuration',
      id: '81liT7',
      description: 'Workflow configuration step title',
    }),
    WORKFLOW_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Workflow Name',
      id: 'OwjR0o',
      description: 'Workflow name field label',
    }),
    WORKFLOW_TYPE_LABEL: intl.formatMessage({
      defaultMessage: 'Workflow Type',
      id: 'JdYNQ+',
      description: 'Workflow type label',
    }),
    WORKFLOW_TYPE_PLACEHOLDER: intl.formatMessage({
      defaultMessage: 'Select workflow type',
      id: '0H5p4k',
      description: 'Select workflow type placeholder',
    }),
    WORKFLOW_NAME_PLACEHOLDER: intl.formatMessage({
      defaultMessage: 'Enter workflow name',
      id: 'nVhDGu',
      description: 'Workflow name field placeholder',
    }),
    STATEFUL_TITLE: intl.formatMessage({
      defaultMessage: 'Stateful',
      id: 'p4Mgce',
      description: 'Stateful workflow option',
    }),
    STATEFUL_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Optimized for high reliability, ideal for process business transitional data.',
      id: 'otRX33',
      description: 'Stateful workflow description',
    }),
    STATELESS_TITLE: intl.formatMessage({
      defaultMessage: 'Stateless',
      id: 'R7gB/3',
      description: 'Stateless workflow option',
    }),
    STATELESS_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Optimized for low latency, ideal for request-response and processing IoT events.',
      id: 'b0wO2+',
      description: 'Stateless workflow description',
    }),
    AUTONOMOUS_TITLE: intl.formatMessage({
      defaultMessage: 'Autonomous Agents (Preview)',
      id: 'qs798U',
      description: 'Autonomous agents workflow option',
    }),
    AUTONOMOUS_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'All the benefits of Stateful, plus the option to build AI agents in your workflow to automate complex tasks.',
      id: 'Bft/H3',
      description: 'Autonomous agents workflow description',
    }),
    AGENT_TITLE: intl.formatMessage({
      defaultMessage: 'Conversational Agents',
      id: 'fg89hL',
      description: 'Conversational agent workflow option',
    }),
    AGENT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Workflow that supports natural language, human interaction, and agents connected to LLMs',
      id: '+P+nuy',
      description: 'Conversational agents workflow description',
    }),
    EMPTY_WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name cannot be empty.',
      id: 'jfWu9H',
      description: 'Workflow name empty text',
    }),
    WORKFLOW_NAME_VALIDATION_MESSAGE: intl.formatMessage({
      defaultMessage: 'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".',
      id: 'V3DWT4',
      description: 'Workflow name validation message text',
    }),
  };

  const handleWorkflowTypeChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setWorkflowType(data.optionValue));
    }
  };

  const handleWorkflowNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWorkflowName(event.target.value));
    setWorkflowNameError(validateWorkflowName(event.target.value, intlText));
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.TITLE}</Text>

      <Field
        label={intlText.WORKFLOW_NAME_LABEL}
        className={styles.workflowNameField}
        required
        validationState={workflowNameError ? 'error' : undefined}
        validationMessage={workflowNameError}
      >
        <Input
          value={workflowName}
          onChange={handleWorkflowNameChange}
          placeholder={intlText.WORKFLOW_NAME_PLACEHOLDER}
          className={styles.inputControl}
        />
      </Field>

      <Field required>
        <Label required>{intlText.WORKFLOW_TYPE_LABEL}</Label>
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
          placeholder={intlText.WORKFLOW_TYPE_PLACEHOLDER}
          className={styles.inputControl}
        >
          <Option value="Stateful-Codeless" text="Stateful">
            Stateful
          </Option>
          <Option value="Stateless-Codeless" text="Stateless">
            Stateless
          </Option>
          <Option value="Agentic-Codeless" text="Autonomous Agents (Preview)">
            Autonomous Agents (Preview)
          </Option>
          <Option value="Agent-Codeless" text="Conversational Agents">
            Conversational Agents
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
