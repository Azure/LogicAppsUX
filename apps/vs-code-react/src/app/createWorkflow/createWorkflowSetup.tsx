/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { WorkflowTypeStep } from '../createWorkspace/steps/workflowTypeStep';
import { Dropdown, Field, Label, Option, Text } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../state/store';
import { setLogicAppName, setLogicAppType } from '../../state/createWorkspaceSlice';
import type { AvailableProject } from '../../state/createWorkspaceSlice';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

const SELECT_PROJECT_PLACEHOLDER = 'Select Project';

export const CreateWorkflowSetup = () => {
  const styles = useCreateWorkspaceStyles();
  const dispatch = useDispatch();
  const { logicAppName, availableProjects } = useSelector((state: RootState) => state.createWorkspace);

  const handleProjectChange: DropdownProps['onOptionSelect'] = (_event, data) => {
    if (data.optionValue) {
      const selected = availableProjects.find((p: AvailableProject) => p.name === data.optionValue);
      dispatch(setLogicAppName(data.optionValue));
      if (selected) {
        dispatch(setLogicAppType(selected.isCodeful ? ProjectType.codeful : ''));
      }
    }
  };

  const showProjectDropdown = availableProjects.length > 0;

  return (
    <div className={styles.formSection}>
      {showProjectDropdown && (
        <>
          <Text className={styles.sectionTitle}>Project</Text>
          <Field required>
            <Label required>Project</Label>
            <Dropdown
              value={logicAppName || ''}
              selectedOptions={logicAppName ? [logicAppName] : []}
              onOptionSelect={handleProjectChange}
              placeholder={SELECT_PROJECT_PLACEHOLDER}
              className={styles.inputControl}
            >
              {availableProjects.map((project: AvailableProject) => (
                <Option value={project.name} key={project.name} text={project.name}>
                  {project.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </>
      )}
      <WorkflowTypeStep />
    </div>
  );
};
