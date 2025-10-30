/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text, Dropdown, Option, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData, DropdownProps } from '@fluentui/react-components';
import { useState, useEffect, useCallback } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { setTargetFramework, setFunctionNamespace, setFunctionName, setFunctionFolderName } from '../../../state/createWorkspaceSlice';
import { useIntlMessages, workspaceMessages } from '../../../intl';
import { useSelector, useDispatch } from 'react-redux';
import { nameValidation, validateFunctionName, validateFunctionNamespace } from '../utils/validation';
import { Platform, ProjectType } from '@microsoft/vscode-extension-logic-apps';

export const DotNetFrameworkStep: React.FC = () => {
  const dispatch = useDispatch();
  const intlText = useIntlMessages(workspaceMessages);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { targetFramework, functionNamespace, functionName, platform, functionFolderName, logicAppType, logicAppName, workspaceFileJson } =
    createWorkspaceState;

  const functionNamespaceId = useId();
  const functionNameId = useId();
  const functionFolderNameId = useId();

  // Validation state
  const [functionNamespaceError, setFunctionNamespaceError] = useState<string | undefined>(undefined);
  const [functionNameError, setFunctionNameError] = useState<string | undefined>(undefined);
  const [functionFolderNameError, setFunctionFolderNameError] = useState<string | undefined>(undefined);

  const handleDotNetFrameworkChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setTargetFramework(data.optionValue));
    }
  };

  const validateFunctionFolderName = useCallback(
    (name: string) => {
      if (!name) {
        return intlText.FUNCTION_FOLDER_NAME_EMPTY;
      }
      if (!nameValidation.test(name)) {
        return intlText.FUNCTION_FOLDER_NAME_VALIDATION;
      }
      // Check if function folder name is the same as logic app name
      if (logicAppName && name.trim().toLowerCase() === logicAppName.trim().toLowerCase()) {
        return intlText.FUNCTION_FOLDER_SAME_AS_LOGIC_APP;
      }
      // Check if the function name already exists in workspace folders
      if (workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return intlText.FUNCTION_FOLDER_EXISTS;
      }
      return undefined;
    },
    [
      intlText.FUNCTION_FOLDER_NAME_EMPTY,
      intlText.FUNCTION_FOLDER_EXISTS,
      intlText.FUNCTION_FOLDER_SAME_AS_LOGIC_APP,
      intlText.FUNCTION_FOLDER_NAME_VALIDATION,
      logicAppName,
      workspaceFileJson,
    ]
  );

  useEffect(() => {
    if (functionFolderName) {
      setFunctionFolderNameError(validateFunctionFolderName(functionFolderName));
    }
  }, [functionFolderName, validateFunctionFolderName]);

  const handleFunctionNamespaceChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setFunctionNamespace(data.value));
    setFunctionNamespaceError(validateFunctionNamespace(data.value, intlText));
  };

  const handleFunctionNameChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setFunctionName(data.value));
    setFunctionNameError(validateFunctionName(data.value, intlText));
  };

  const handleFunctionFolderNameChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setFunctionFolderName(data.value));
    setFunctionFolderNameError(validateFunctionFolderName(data.value));
  };

  if (logicAppType === ProjectType.customCode) {
    return (
      <div className={styles.formSection}>
        <Text className={styles.sectionTitle}>{intlText.CUSTOM_CODE_CONFIGURATION}</Text>

        <div className={styles.fieldContainer}>
          <Field required>
            <Label required>{intlText.DOTNET_VERSION}</Label>
            <Dropdown
              value={targetFramework === 'net472' ? '.NET Framework' : targetFramework === 'net8' ? '.NET 8' : ''}
              selectedOptions={targetFramework ? [targetFramework] : []}
              onOptionSelect={handleDotNetFrameworkChange}
              placeholder={intlText.SELECT_DOTNET_VERSION}
              className={styles.inputControl}
            >
              {platform === Platform.windows ? (
                <Option value="net472" text=".NET Framework">
                  .NET Framework
                </Option>
              ) : null}
              <Option value="net8" text=".NET 8">
                .NET 8
              </Option>
            </Dropdown>
            {targetFramework && (
              <Text
                size={200}
                style={{
                  color: 'var(--colorNeutralForeground2)',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {targetFramework === 'net472' && intlText.DOTNET_FRAMEWORK_DESCRIPTION}
                {targetFramework === 'net8' && intlText.DOTNET_8_DESCRIPTION}
              </Text>
            )}
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionFolderNameError ? 'error' : undefined} validationMessage={functionFolderNameError}>
            <Label required htmlFor={functionFolderNameId}>
              {intlText.CUSTOM_CODE_FOLDER_NAME}
            </Label>
            <Input
              id={functionFolderNameId}
              value={functionFolderName}
              onChange={handleFunctionFolderNameChange}
              className={styles.inputControl}
            />
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionNamespaceError ? 'error' : undefined} validationMessage={functionNamespaceError}>
            <Label required htmlFor={functionNamespaceId}>
              {intlText.FUNCTION_NAMESPACE}
            </Label>
            <Input
              id={functionNamespaceId}
              value={functionNamespace}
              onChange={handleFunctionNamespaceChange}
              className={styles.inputControl}
            />
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionNameError ? 'error' : undefined} validationMessage={functionNameError}>
            <Label required htmlFor={functionNameId}>
              {intlText.FUNCTION_NAME}
            </Label>
            <Input id={functionNameId} value={functionName} onChange={handleFunctionNameChange} className={styles.inputControl} />
          </Field>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.RULES_ENGINE_CONFIGURATION}</Text>

      <div className={styles.fieldContainer}>
        <Field required validationState={functionFolderNameError ? 'error' : undefined} validationMessage={functionFolderNameError}>
          <Label required htmlFor={functionFolderNameId}>
            {intlText.RULES_ENGINE_FOLDER_NAME}
          </Label>
          <Input
            id={functionFolderNameId}
            value={functionFolderName}
            onChange={handleFunctionFolderNameChange}
            className={styles.inputControl}
          />
        </Field>
      </div>

      <div className={styles.fieldContainer}>
        <Field required validationState={functionNamespaceError ? 'error' : undefined} validationMessage={functionNamespaceError}>
          <Label required htmlFor={functionNamespaceId}>
            {intlText.FUNCTION_NAMESPACE_LABEL}
          </Label>
          <Input
            id={functionNamespaceId}
            value={functionNamespace}
            onChange={handleFunctionNamespaceChange}
            className={styles.inputControl}
          />
        </Field>
      </div>

      <div className={styles.fieldContainer}>
        <Field required validationState={functionNameError ? 'error' : undefined} validationMessage={functionNameError}>
          <Label required htmlFor={functionNameId}>
            {intlText.FUNCTION_NAME_LABEL}
          </Label>
          <Input id={functionNameId} value={functionName} onChange={handleFunctionNameChange} className={styles.inputControl} />
        </Field>
      </div>
    </div>
  );
};
