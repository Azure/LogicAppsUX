/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text, Dropdown, Option, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData, DropdownProps } from '@fluentui/react-components';
import { useState } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setTargetFramework, setFunctionWorkspace, setFunctionName } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

// Function name validation regex (similar to logic app name)
export const functionNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const namespaceValidation = /^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

export const DotNetFrameworkStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { targetFramework, functionWorkspace, functionName, logicAppType, workspaceFileJson } = createWorkspaceState;

  const functionWorkspaceId = useId();
  const functionNameId = useId();

  // Validation state
  const [functionWorkspaceError, setFunctionWorkspaceError] = useState<string | undefined>(undefined);
  const [functionNameError, setFunctionNameError] = useState<string | undefined>(undefined);

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Custom Code Configuration',
      id: 'um0VMI',
      description: 'Custom code configuration step title',
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
    FUNCTION_WORKSPACE_LABEL: intl.formatMessage({
      defaultMessage: 'Function Workspace',
      id: 'mBP+0f',
      description: 'Function workspace input label',
    }),
    FUNCTION_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Function Name',
      id: 'q8vsUq',
      description: 'Function name input label',
    }),
  };

  const handleDotNetFrameworkChange: DropdownProps['onOptionSelect'] = (event, data) => {
    if (data.optionValue) {
      dispatch(setTargetFramework(data.optionValue));
    }
  };

  const validateFunctionWorkspace = (workspace: string) => {
    if (!workspace) {
      return 'Function workspace cannot be empty.';
    }
    if (!namespaceValidation.test(workspace)) {
      return 'The namespace must start with a letter or underscore, contain only letters, digits, underscores, and periods, and must not end with a period.';
    }
    return undefined;
  };

  const validateFunctionName = (name: string) => {
    if (!name) {
      return 'Function name cannot be empty.';
    }
    if (!functionNameValidation.test(name)) {
      return 'Function name must start with a letter and can only contain letters, digits, "_" and "-".';
    }
    // Check if the function name already exists in workspace folders
    if (workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
      return 'A project with this name already exists in the workspace.';
    }
    return undefined;
  };

  const handleFunctionWorkspaceChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setFunctionWorkspace(data.value));
    setFunctionWorkspaceError(validateFunctionWorkspace(data.value));
  };

  const handleFunctionNameChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setFunctionName(data.value));
    setFunctionNameError(validateFunctionName(data.value));
  };

  if (logicAppType === 'customCode') {
    return (
      <div className={styles.formSection}>
        <Text className={styles.sectionTitle} style={{ display: 'block' }}>
          {intlText.TITLE}
        </Text>

        <div className={styles.fieldContainer}>
          <Field required>
            <Label>{intlText.NET_VERSION_LABEL}</Label>
            <Dropdown
              value={targetFramework === 'net472' ? '.NET Framework' : targetFramework === 'net8' ? '.NET 8' : ''}
              selectedOptions={targetFramework ? [targetFramework] : []}
              onOptionSelect={handleDotNetFrameworkChange}
              placeholder="Select .NET version"
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
          <Field required validationState={functionWorkspaceError ? 'error' : undefined} validationMessage={functionWorkspaceError}>
            <Label htmlFor={functionWorkspaceId}>{intlText.FUNCTION_WORKSPACE_LABEL}</Label>
            <Input
              id={functionWorkspaceId}
              value={functionWorkspace}
              onChange={handleFunctionWorkspaceChange}
              className={styles.inputControl}
            />
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionNameError ? 'error' : undefined} validationMessage={functionNameError}>
            <Label htmlFor={functionNameId}>{intlText.FUNCTION_NAME_LABEL}</Label>
            <Input id={functionNameId} value={functionName} onChange={handleFunctionNameChange} className={styles.inputControl} />
          </Field>
        </div>
      </div>
    );
  }
  if (logicAppType === 'rulesEngine') {
    return (
      <div className={styles.formSection}>
        <Text className={styles.sectionTitle} style={{ display: 'block' }}>
          {'Function Configuration'}
        </Text>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionWorkspaceError ? 'error' : undefined} validationMessage={functionWorkspaceError}>
            <Label htmlFor={functionWorkspaceId}>{intlText.FUNCTION_WORKSPACE_LABEL}</Label>
            <Input
              id={functionWorkspaceId}
              value={functionWorkspace}
              onChange={handleFunctionWorkspaceChange}
              className={styles.inputControl}
            />
          </Field>
        </div>

        <div className={styles.fieldContainer}>
          <Field required validationState={functionNameError ? 'error' : undefined} validationMessage={functionNameError}>
            <Label htmlFor={functionNameId}>{intlText.FUNCTION_NAME_LABEL}</Label>
            <Input id={functionNameId} value={functionName} onChange={handleFunctionNameChange} className={styles.inputControl} />
          </Field>
        </div>
      </div>
    );
  }
  return null;
};
