/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, Text, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setProjectPathAlt, setWorkspaceName } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { VSCodeContext } from '../../../webviewCommunication';
import { useContext, useState, useCallback, useEffect } from 'react';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

// Regex validation constants
export const workspaceNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;

export const WorkspaceNameStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { workspaceName, workspaceProjectPath, pathValidationResults } = createWorkspaceState;
  const projectPathInputId = useId();
  const workspaceNameId = useId();

  // Validation state
  const [workspaceNameError, setWorkspaceNameError] = useState<string | undefined>(undefined);
  const [projectPathError, setProjectPathError] = useState<string | undefined>(undefined);
  const [isValidatingPath, setIsValidatingPath] = useState<boolean>(false);

  const separator = workspaceProjectPath.fsPath?.includes('/') ? '/' : '\\';

  // const inputId = useId();

  // Compute the full path to the .code-workspace folder
  // const workspaceFolderPath =
  //   projectPath && workspaceName
  //     ? (() => {
  //         // Ensure proper path separator based on the existing path
  //         const separator = projectPath.includes('/') ? '/' : '\\';
  //         const normalizedPath = projectPath.endsWith(separator) ? projectPath : `${projectPath}${separator}`;
  //         return `${normalizedPath}${workspaceName}`;
  //       })()
  //     : '';

  // // Compute the full path to the .code-workspace file
  // const workspaceFilePath =
  //   projectPath && workspaceName
  //     ? (() => {
  //         // Ensure proper path separator based on the existing path
  //         const separator = projectPath.includes('/') ? '/' : '\\';
  //         const normalizedPath = projectPath.endsWith(separator) ? projectPath : `${projectPath}${separator}`;
  //         return `${normalizedPath}${workspaceName}${separator}${workspaceName}.code-workspace`;
  //       })()
  //     : '';

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Project Setup',
      id: 'blShaR',
      description: 'Project setup step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Configure your logic app workspace settings',
      id: 'JS4ajl',
      description: 'Project setup step description',
    }),
    // Folder Selection
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
    WORKSPACE_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace Name',
      id: 'uNvoPg',
      description: 'Workspace name input label',
    }),
    WORKSPACE_FOLDER_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace Folder Location',
      id: 'gis0SV',
      description: 'Workspace folder location label',
    }),
    WORKSPACE_FILE_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace File Location',
      id: 'ObsExh',
      description: 'Workspace file location label',
    }),
  };

  const validateProjectPath = useCallback(
    (path: string) => {
      if (!path) {
        return 'Workspace parent folder path cannot be empty.';
      }

      // Check if we have a validation result for this path
      const isPathValid = pathValidationResults[path];
      if (isPathValid === false) {
        return 'The specified path does not exist or is not accessible.';
      }

      return undefined;
    },
    [pathValidationResults]
  );

  // Debounced path validation function
  const validatePathWithExtension = useCallback(
    (path: string, validationResults: Record<string, boolean>) => {
      if (path && path.trim() !== '') {
        if (path in validationResults) {
          setIsValidatingPath(false);
          const validationError = validateProjectPath(path);
          setProjectPathError(validationError);
          return; // Don't trigger new validation if we already have results
        }
        setIsValidatingPath(true);
        vscode.postMessage({
          command: ExtensionCommand.validatePath,
          data: { path: path.trim() },
        });
      }
    },
    [vscode, validateProjectPath]
  );

  // Effect to trigger path validation when path changes
  useEffect(() => {
    if (workspaceProjectPath.fsPath && workspaceProjectPath.fsPath.trim() !== '') {
      const timeoutId = setTimeout(() => {
        validatePathWithExtension(workspaceProjectPath.fsPath, pathValidationResults);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [workspaceProjectPath.fsPath, pathValidationResults, validatePathWithExtension]);

  const validateWorkspaceName = (name: string) => {
    if (!name) {
      return 'The workspace name cannot be empty.';
    }
    if (!workspaceNameValidation.test(name)) {
      return 'Workspace name must start with a letter and can only contain letters, digits, "_" and "-".';
    }
    return undefined;
  };

  const handleProjectPathChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setProjectPathAlt(data.value));
    setProjectPathError(validateProjectPath(data.value));
  };

  const handleWorkspaceNameChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setWorkspaceName(data.value));
    setWorkspaceNameError(validateWorkspaceName(data.value));
  };

  const onOpenExplorer = () => {
    vscode.postMessage({
      command: ExtensionCommand.select_folder,
    });
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>
      <Text className={styles.stepDescription} style={{ display: 'block' }}>
        {intlText.DESCRIPTION}
      </Text>

      <div className={styles.fieldContainer}>
        <Field
          required
          validationState={projectPathError ? 'error' : isValidatingPath ? 'warning' : undefined}
          validationMessage={projectPathError || (isValidatingPath ? 'Validating path...' : undefined)}
        >
          <Label htmlFor={projectPathInputId}>{intlText.PROJECT_PATH_LABEL}</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              id={projectPathInputId}
              value={workspaceProjectPath.fsPath ?? ''}
              onChange={handleProjectPathChange}
              className={styles.inputControl}
              style={{ width: '800px', fontFamily: 'monospace' }}
            />
            <Button onClick={onOpenExplorer} className={styles.browseButton}>
              {intlText.BROWSE_BUTTON}
            </Button>
          </div>
          {workspaceProjectPath.path && (
            <Text
              size={200}
              style={{
                color: 'var(--colorNeutralForeground2)',
                fontFamily: 'monospace',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {workspaceProjectPath.fsPath}
            </Text>
          )}
        </Field>
      </div>
      <div className={styles.fieldContainer}>
        <Field required validationState={workspaceNameError ? 'error' : undefined} validationMessage={workspaceNameError}>
          <Label htmlFor={workspaceNameId}>{intlText.WORKSPACE_NAME_LABEL}</Label>
          <Input id={workspaceNameId} value={workspaceName} onChange={handleWorkspaceNameChange} className={styles.inputControl} />
          {workspaceName && workspaceProjectPath.path && (
            <Text
              size={200}
              style={{
                color: 'var(--colorNeutralForeground2)',
                fontFamily: 'monospace',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {`${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${workspaceName}.code-workspace`}
            </Text>
          )}
        </Field>
      </div>
    </div>
  );
};
