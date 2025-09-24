/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Option, Text, Field, Input, Label, Dropdown } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import { useState } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setWorkflowType, setWorkflowName } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

// Workflow name validation regex
export const workflowNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;

export const WorkflowTypeStepAlt: React.FC = () => {
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
  };

  const handleWorkflowTypeChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setWorkflowType(data.optionValue));
    }
  };

  const validateWorkflowName = (name: string) => {
    if (!name) {
      return 'The workflow name cannot be empty.';
    }
    if (!workflowNameValidation.test(name)) {
      return 'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".';
    }
    return undefined;
  };

  const handleWorkflowNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWorkflowName(event.target.value));
    setWorkflowNameError(validateWorkflowName(event.target.value));
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>

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
        <Label>{intlText.WORKFLOW_TYPE_LABEL}</Label>
        <Dropdown
          value={
            workflowType === 'Stateful-Codeless'
              ? 'Stateful'
              : workflowType === 'Stateless-Codeless'
                ? 'Stateless'
                : workflowType === 'Agentic-Codeless'
                  ? 'Autonomous Agents (Preview)'
                  : ''
          }
          selectedOptions={workflowType ? [workflowType] : []}
          onOptionSelect={handleWorkflowTypeChange}
          placeholder="Select workflow type"
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
          </Text>
        )}
      </Field>
    </div>
  );
};
