/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, Text, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setProjectPath, setWorkspaceName } from '../../../state/createWorkspace/createWorkspaceSlice';
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
  const { workspaceName, workspaceProjectPath, pathValidationResults, workspaceExistenceResults, isValidatingWorkspace } =
    createWorkspaceState;
  const projectPathInputId = useId();
  const workspaceNameId = useId();

  // Validation state
  const [workspaceNameError, setWorkspaceNameError] = useState<string | undefined>(undefined);
  const [projectPathError, setProjectPathError] = useState<string | undefined>(undefined);
  const [isValidatingPath, setIsValidatingPath] = useState<boolean>(false);
  const [isValidatingWorkspaceName, setIsValidatingWorkspaceName] = useState<boolean>(false);

  const separator = workspaceProjectPath.fsPath?.includes('/') ? '/' : '\\';

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

  const validateWorkspaceName = useCallback(
    (name: string) => {
      if (!name) {
        return 'The workspace name cannot be empty.';
      }
      if (!workspaceNameValidation.test(name)) {
        return 'Workspace name must start with a letter and can only contain letters, digits, "_" and "-".';
      }

      // Check if workspace folder or file already exists
      if (workspaceProjectPath.fsPath && name) {
        const workspaceFolder = `${workspaceProjectPath.fsPath}${separator}${name}`;
        const workspaceFile = `${workspaceFolder}${separator}${name}.code-workspace`;

        if (workspaceExistenceResults[workspaceFolder] === true) {
          return `A folder named "${name}" already exists in the selected location.`;
        }
        if (workspaceExistenceResults[workspaceFile] === true) {
          return `A workspace file "${name}.code-workspace" already exists.`;
        }
      }

      return undefined;
    },
    [workspaceProjectPath.fsPath, separator, workspaceExistenceResults]
  );

  // Debounced path validation function
  const validatePathWithExtension = useCallback(
    (path: string, validationResults: Record<string, boolean>) => {
      if (path && path.trim() !== '') {
        if (path in validationResults) {
          setIsValidatingPath(false);
          const validationError = validateProjectPath(path);
          setProjectPathError(validationError);
          return;
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

  // Function to validate workspace existence
  const validateWorkspaceExistence = useCallback(
    (parentPath: string, name: string, workspaceExistenceResults: Record<string, boolean>) => {
      if (parentPath && name) {
        const workspaceFolder = `${parentPath}${separator}${name}`;
        const workspaceFile = `${workspaceFolder}${separator}${name}.code-workspace`;

        // Check if we already have results for these paths
        if (workspaceFolder in workspaceExistenceResults || workspaceFile in workspaceExistenceResults) {
          setIsValidatingWorkspaceName(false);
          const validationError = validateWorkspaceName(name);
          setWorkspaceNameError(validationError);
          return;
        }

        setIsValidatingWorkspaceName(true);
        // Validate both the workspace folder and file
        vscode.postMessage({
          command: ExtensionCommand.validatePath,
          data: {
            path: workspaceFolder,
            type: ExtensionCommand.workspace_folder,
          },
        });
        vscode.postMessage({
          command: ExtensionCommand.validatePath,
          data: {
            path: workspaceFile,
            type: ExtensionCommand.workspace_file,
          },
        });
      }
    },
    [vscode, separator, validateWorkspaceName]
  );

  // Effect to trigger path validation when path changes
  useEffect(() => {
    if (workspaceProjectPath.fsPath && workspaceProjectPath.fsPath.trim() !== '') {
      const timeoutId = setTimeout(() => {
        validatePathWithExtension(workspaceProjectPath.fsPath, pathValidationResults);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [workspaceProjectPath.fsPath, pathValidationResults, validatePathWithExtension]);

  // Effect to validate workspace existence when both path and name are available
  useEffect(() => {
    if (workspaceProjectPath.fsPath && workspaceName) {
      const timeoutId = setTimeout(() => {
        validateWorkspaceExistence(workspaceProjectPath.fsPath, workspaceName, workspaceExistenceResults);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [workspaceProjectPath.fsPath, workspaceName, validateWorkspaceExistence, workspaceExistenceResults]);

  const handleProjectPathChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setProjectPath(data.value));
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
            <Button onClick={onOpenExplorer} className={styles.browseButton} disabled={isValidatingPath}>
              {isValidatingPath ? 'Validating...' : intlText.BROWSE_BUTTON}
            </Button>
          </div>
          {workspaceProjectPath.fsPath && (
            <Text
              size={200}
              style={{
                color:
                  pathValidationResults[workspaceProjectPath.fsPath] === true
                    ? 'var(--colorPaletteGreenForeground1)'
                    : pathValidationResults[workspaceProjectPath.fsPath] === false
                      ? 'var(--colorPaletteRedForeground1)'
                      : 'var(--colorNeutralForeground2)',
                fontFamily: 'monospace',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {workspaceProjectPath.fsPath}
              {pathValidationResults[workspaceProjectPath.fsPath] === true && ' ✓ Valid path'}
              {pathValidationResults[workspaceProjectPath.fsPath] === false && ' ✗ Invalid path'}
            </Text>
          )}
        </Field>
      </div>
      <div className={styles.fieldContainer}>
        <Field
          required
          validationState={workspaceNameError ? 'error' : isValidatingWorkspaceName ? 'warning' : undefined}
          validationMessage={workspaceNameError || (isValidatingWorkspaceName ? 'Checking workspace availability...' : undefined)}
        >
          <Label htmlFor={workspaceNameId}>{intlText.WORKSPACE_NAME_LABEL}</Label>
          <Input id={workspaceNameId} value={workspaceName} onChange={handleWorkspaceNameChange} className={styles.inputControl} />
          {workspaceName && workspaceProjectPath.fsPath && (
            <Text
              size={200}
              style={{
                color: workspaceNameError
                  ? 'var(--colorPaletteRedForeground1)'
                  : pathValidationResults[workspaceProjectPath.fsPath] === true
                    ? 'var(--colorPaletteGreenForeground1)'
                    : 'var(--colorNeutralForeground2)',
                fontFamily: 'monospace',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {`${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${workspaceName}.code-workspace`}
              {isValidatingWorkspace && ' (Checking availability...)'}
              {!workspaceNameError &&
                !isValidatingWorkspace &&
                pathValidationResults[workspaceProjectPath.fsPath] === true &&
                ' ✓ Available'}
            </Text>
          )}
        </Field>
      </div>
    </div>
  );
};
