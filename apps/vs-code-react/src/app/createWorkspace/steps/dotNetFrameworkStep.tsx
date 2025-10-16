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
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { nameValidation, validateFunctionName, validateFunctionNamespace } from '../validation/helper';

export const DotNetFrameworkStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { targetFramework, functionNamespace, functionName, functionFolderName, logicAppType, logicAppName, workspaceFileJson } =
    createWorkspaceState;

  const functionNamespaceId = useId();
  const functionNameId = useId();
  const functionFolderNameId = useId();

  // Validation state
  const [functionNamespaceError, setFunctionNamespaceError] = useState<string | undefined>(undefined);
  const [functionNameError, setFunctionNameError] = useState<string | undefined>(undefined);
  const [functionFolderNameError, setFunctionFolderNameError] = useState<string | undefined>(undefined);

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Custom Code Configuration',
      id: 'um0VMI',
      description: 'Custom code configuration step title',
    }),
    RULES_ENGINE_TITLE: intl.formatMessage({
      defaultMessage: 'Rules Engine Configuration',
      id: 'dTzRAM',
      description: 'Rules engine configuration step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Configure the settings for your custom code logic app',
      id: 'esTnYd',
      description: 'Custom code configuration step description',
    }),
    NET_VERSION_LABEL: intl.formatMessage({
      defaultMessage: '.NET Version',
      id: 'Sc6upt',
      description: '.NET version dropdown label',
    }),
    NET_FRAMEWORK_LABEL: intl.formatMessage({
      defaultMessage: '.NET Framework',
      id: 'xQHAPW',
      description: '.NET Framework option',
    }),
    NET_FRAMEWORK_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Use the traditional .NET Framework for legacy compatibility',
      id: 'VLHQ4L',
      description: '.NET Framework description',
    }),
    NET_8_LABEL: intl.formatMessage({
      defaultMessage: '.NET 8',
      id: 't2nswK',
      description: '.NET 8 option',
    }),
    NET_8_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Use the latest .NET 8 for modern development and performance',
      id: 'q1dxkD',
      description: '.NET 8 description',
    }),
    FUNCTION_NAMESPACE_LABEL: intl.formatMessage({
      defaultMessage: 'Function Namespace',
      id: '2XLzvL',
      description: 'Function namespace input label',
    }),
    FUNCTION_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Function Name',
      id: 'q8vsUq',
      description: 'Function name input label',
    }),
    CUSTOM_CODE_FOLDER_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Custom Code Folder Name',
      id: '6tG5dm',
      description: 'Custom code folder name input label',
    }),
    RULES_ENGINE_FOLDER_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Rules Engine Folder Name',
      id: 'jaa2Wl',
      description: 'Rules engine folder name input label',
    }),
    NET_VERSION_PLACEHOLDER: intl.formatMessage({
      defaultMessage: 'Select .NET version',
      id: 'XEetXV',
      description: 'Select .NET version placeholder text',
    }),
    EMPTY_FUNCTION_NAMESPACE: intl.formatMessage({
      defaultMessage: 'Function namespace cannot be empty.',
      id: 'ZY5ygq',
      description: 'Function namespace empty text',
    }),
    FUNCTION_NAMESPACE_VALIDATION_MESSAGE: intl.formatMessage({
      defaultMessage:
        'The namespace must start with a letter or underscore, contain only letters, digits, underscores, and periods, and must not end with a period.',
      id: 'unrpCO',
      description: 'Function namespace validation message text',
    }),
    EMPTY_FUNCTION_NAME: intl.formatMessage({
      defaultMessage: 'Function name cannot be empty.',
      id: 'MbFszg',
      description: 'Function name empty text',
    }),
    FUNCTION_NAME_VALIDATION_MESSAGE: intl.formatMessage({
      defaultMessage: 'Function name must start with a letter and can only contain letters, digits, "_" and "-".',
      id: 'DdAlJ9',
      description: 'Function name validation message text',
    }),
    EMPTY_FUNCTION_FOLDER_NAME: intl.formatMessage({
      defaultMessage: 'Function folder name cannot be empty.',
      id: 'Vk1TBl',
      description: 'Function folder name empty text',
    }),
    FUNCTION_FOLDER_NAME_VALIDATION_MESSAGE: intl.formatMessage({
      defaultMessage: 'Function folder name must start with a letter and can only contain letters, digits, "_" and "-".',
      id: 'ZSRPr2',
      description: 'Function folder name validation message text',
    }),
    FUNCTION_FOLDER_NAME_SAME: intl.formatMessage({
      defaultMessage: 'Function folder name cannot be the same as the logic app name.',
      id: '/kz09u',
      description: 'Function folder name same as logic app name text',
    }),
    FUNCTION_FOLDER_NAME_EXISTS: intl.formatMessage({
      defaultMessage: 'A project with this name already exists in the workspace.',
      id: '7bhWPe',
      description: 'Function folder name exists in workspace text',
    }),
  };

  const handleDotNetFrameworkChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setTargetFramework(data.optionValue));
    }
  };

  const validateFunctionFolderName = useCallback(
    (name: string) => {
      if (!name) {
        return intlText.EMPTY_FUNCTION_FOLDER_NAME;
      }
      if (!nameValidation.test(name)) {
        return intlText.FUNCTION_FOLDER_NAME_VALIDATION_MESSAGE;
      }
      // Check if function folder name is the same as logic app name
      if (logicAppName && name.trim().toLowerCase() === logicAppName.trim().toLowerCase()) {
        return intlText.FUNCTION_FOLDER_NAME_SAME;
      }
      // Check if the function name already exists in workspace folders
      if (workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return intlText.FUNCTION_FOLDER_NAME_EXISTS;
      }
      return undefined;
    },
    [
      intlText.EMPTY_FUNCTION_FOLDER_NAME,
      intlText.FUNCTION_FOLDER_NAME_EXISTS,
      intlText.FUNCTION_FOLDER_NAME_SAME,
      intlText.FUNCTION_FOLDER_NAME_VALIDATION_MESSAGE,
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

  if (logicAppType === 'customCode') {
    return (
      <div className={styles.formSection}>
        <Text className={styles.sectionTitle}>{intlText.TITLE}</Text>

        <div className={styles.fieldContainer}>
          <Field required>
            <Label required>{intlText.NET_VERSION_LABEL}</Label>
            <Dropdown
              value={targetFramework === 'net472' ? '.NET Framework' : targetFramework === 'net8' ? '.NET 8' : ''}
              selectedOptions={targetFramework ? [targetFramework] : []}
              onOptionSelect={handleDotNetFrameworkChange}
              placeholder={intlText.NET_VERSION_PLACEHOLDER}
              className={styles.inputControl}
            >
              <Option value="net472" text=".NET Framework">
                .NET Framework
              </Option>
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
                {targetFramework === 'net472' && intlText.NET_FRAMEWORK_DESCRIPTION}
                {targetFramework === 'net8' && intlText.NET_8_DESCRIPTION}
              </Text>
            )}
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionFolderNameError ? 'error' : undefined} validationMessage={functionFolderNameError}>
            <Label required htmlFor={functionFolderNameId}>
              {intlText.CUSTOM_CODE_FOLDER_NAME_LABEL}
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
  }
  if (logicAppType === 'rulesEngine') {
    return (
      <div className={styles.formSection}>
        <Text className={styles.sectionTitle}>{intlText.RULES_ENGINE_TITLE}</Text>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionFolderNameError ? 'error' : undefined} validationMessage={functionFolderNameError}>
            <Label required htmlFor={functionFolderNameId}>
              {intlText.RULES_ENGINE_FOLDER_NAME_LABEL}
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
  }
  return null;
};
