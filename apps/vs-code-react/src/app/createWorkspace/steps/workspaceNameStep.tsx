/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, Text, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { setProjectPath, setWorkspaceName } from '../../../state/createWorkspaceSlice';
import { useIntlMessages, useIntlFormatters, workspaceMessages } from '../../../intl';
import { useSelector, useDispatch } from 'react-redux';
import { VSCodeContext } from '../../../webviewCommunication';
import { useContext, useState, useCallback, useEffect } from 'react';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { nameValidation } from '../validation/helper';

export const WorkspaceNameStep: React.FC = () => {
  const dispatch = useDispatch();
  const intlText = useIntlMessages(workspaceMessages);
  const format = useIntlFormatters(workspaceMessages);
  const vscode = useContext(VSCodeContext);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { workspaceName, workspaceProjectPath, pathValidationResults, workspaceExistenceResults, isValidatingWorkspace, separator } =
    createWorkspaceState;
  const projectPathInputId = useId();
  const workspaceNameId = useId();

  // Validation state
  const [workspaceNameError, setWorkspaceNameError] = useState<string | undefined>(undefined);
  const [projectPathError, setProjectPathError] = useState<string | undefined>(undefined);
  const [isValidatingPath, setIsValidatingPath] = useState<boolean>(false);
  const [isValidatingWorkspaceName, setIsValidatingWorkspaceName] = useState<boolean>(false);

  const validateProjectPath = useCallback(
    (path: string) => {
      if (!path) {
        return intlText.WORKSPACE_PARENT_FOLDER_EMPTY;
      }
      // Check if we have a validation result for this path
      const isPathValid = pathValidationResults[path];
      if (isPathValid === false) {
        return intlText.PATH_NOT_EXISTS;
      }

      return undefined;
    },
    [intlText.PATH_NOT_EXISTS, intlText.WORKSPACE_PARENT_FOLDER_EMPTY, pathValidationResults]
  );

  const validateWorkspaceName = useCallback(
    (name: string) => {
      if (!name) {
        return intlText.WORKSPACE_NAME_EMPTY;
      }
      if (!nameValidation.test(name)) {
        return intlText.WORKSPACE_NAME_VALIDATION;
      }

      // Check if workspace folder or file already exists
      if (workspaceProjectPath.fsPath && name) {
        const workspaceFolder = `${workspaceProjectPath.fsPath}${separator}${name}`;
        const workspaceFile = `${workspaceFolder}${separator}${name}.code-workspace`;

        if (workspaceExistenceResults[workspaceFolder] === true) {
          return format.FOLDER_EXISTS_MESSAGE({ name });
        }
        if (workspaceExistenceResults[workspaceFile] === true) {
          return format.CODE_WORKSPACE_EXISTS_MESSAGE({ name });
        }
      }

      return undefined;
    },
    [
      workspaceProjectPath.fsPath,
      intlText.WORKSPACE_NAME_EMPTY,
      intlText.WORKSPACE_NAME_VALIDATION,
      separator,
      workspaceExistenceResults,
      format,
    ]
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
      <Text className={styles.sectionTitle}>{intlText.PROJECT_SETUP}</Text>
      <Text className={styles.stepDescription}>{intlText.PROJECT_SETUP_DESCRIPTION}</Text>

      <div className={styles.fieldContainer}>
        <Field
          required
          validationState={projectPathError ? 'error' : isValidatingPath ? 'warning' : undefined}
          validationMessage={projectPathError || (isValidatingPath ? 'Validating path...' : undefined)}
        >
          <Label required htmlFor={projectPathInputId}>
            {intlText.WORKSPACE_PARENT_FOLDER}
          </Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Input
              id={projectPathInputId}
              value={workspaceProjectPath.fsPath ?? ''}
              onChange={handleProjectPathChange}
              className={styles.inputControl}
            />
            <Button onClick={onOpenExplorer} className={styles.browseButton} disabled={isValidatingPath}>
              {isValidatingPath ? intlText.VALIDATING_BROWSE_BUTTON : intlText.BROWSE_BUTTON}
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
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {workspaceProjectPath.fsPath}
              {pathValidationResults[workspaceProjectPath.fsPath] === true ? ' ✓ Valid path' : ' ✗ Invalid path'}
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
          <Label required htmlFor={workspaceNameId}>
            {intlText.WORKSPACE_NAME_LABEL}
          </Label>
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
