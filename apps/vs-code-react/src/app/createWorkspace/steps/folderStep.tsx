/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text, Field, Input, Button, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { VSCodeContext } from '../../../webviewCommunication';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setProjectPathAlt } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

export const FolderStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { workspaceProjectPath } = createWorkspaceState;
  const inputId = useId();

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Select Workspace Parent Folder',
      id: 'o2Bopk',
      description: 'Workspace Parent Folder step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the folder that will contain your logic app workspace folder',
      id: 'F7To5U',
      description: 'Folder step description',
    }),
    PROJECT_PATH_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace Parent Folder Path',
      id: '3KYXwl',
      description: 'Workspace Parent Folder path input label',
    }),
    BROWSE_BUTTON: intl.formatMessage({
      defaultMessage: 'Browse...',
      id: 'cR0MlP',
      description: 'Browse folder button',
    }),
  };

  const handleProjectPathChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setProjectPathAlt(data.value));
  };

  const handleBrowseFolder = () => {
    vscode.postMessage({
      command: 'select-folder',
      data: {},
    });
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>
      <div className={styles.fieldContainer}>
        <Field required>
          <Label htmlFor={inputId}>{intlText.PROJECT_PATH_LABEL}</Label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Input
              id={inputId}
              value={workspaceProjectPath.path}
              onChange={handleProjectPathChange}
              className={styles.inputControl}
              style={{
                flex: 1,
                minWidth: '300px', // Ensure minimum width for readability
                fontFamily: 'monospace', // Use monospace for better path readability
              }}
              title={workspaceProjectPath.path} // Show full path on hover
            />
            <Button appearance="secondary" onClick={handleBrowseFolder}>
              {intlText.BROWSE_BUTTON}
            </Button>
          </div>
        </Field>
        {workspaceProjectPath.path && <div className={styles.pathDisplay}>{workspaceProjectPath.fsPath.toString()}</div>}
      </div>
    </div>
  );
};
