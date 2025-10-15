/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text, RadioGroup, Radio, Field, Input, Combobox, Option } from '@fluentui/react-components';
import { useState, useCallback, useEffect } from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { setLogicAppType, setLogicAppName, setTargetFramework } from '../../../state/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { nameValidation } from '../validation/helper';

export const LogicAppTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const {
    logicAppType,
    logicAppName,
    functionFolderName,
    workspaceName,
    workspaceProjectPath,
    workspaceFileJson,
    logicAppsWithoutCustomCode,
    flowType,
    separator,
  } = createWorkspaceState;

  const shouldShowLogicAppSection = flowType === 'createWorkspace' || flowType === 'createLogicApp';

  // Validation state
  const [logicAppNameError, setLogicAppNameError] = useState<string | undefined>(undefined);

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Logic App Details',
      id: 'XJ1S7E',
      description: 'Logic app details step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Enter the logic app name and select the type of logic app to create',
      id: 'VPcN7p',
      description: 'Logic app details step description',
    }),
    LOGIC_APP_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App Name',
      id: 'JS7xBY',
      description: 'Logic app name field label',
    }),
    LOGIC_APP_NAME_PLACEHOLDER: intl.formatMessage({
      defaultMessage: 'Enter logic app name',
      id: 'ceM0tn',
      description: 'Logic app name field placeholder',
    }),
    STANDARD_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App (Standard)',
      id: 'xnJNZH',
      description: 'Standard logic app option',
    }),
    STANDARD_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Standard logic app with built-in connectors and triggers',
      id: 'CfXSvL',
      description: 'Standard logic app description',
    }),
    CUSTOM_CODE_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App with Custom Code',
      id: '2ivADw',
      description: 'Logic app with custom code option',
    }),
    CUSTOM_CODE_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Logic app that allows custom code integration and advanced scenarios',
      id: 'kkKTEH',
      description: 'Logic app with custom code description',
    }),
    RULES_ENGINE_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App with Rules Engine',
      id: 'yoH8Yw',
      description: 'Logic app with rules engine option',
    }),
    RULES_ENGINE_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Logic app with built-in business rules engine for complex decision logic',
      id: 'Fsc9ZE',
      description: 'Logic app with rules engine description',
    }),
    EMPTY_LOGIC_APP_NAME: intl.formatMessage({
      defaultMessage: 'Logic app name cannot be empty.',
      id: 'CBcl2V',
      description: 'Logic app name empty text',
    }),
    LOGIC_APP_NAME_VALIDATION_MESSAGE: intl.formatMessage({
      defaultMessage: 'Logic app name must start with a letter and can only contain letters, digits, "_" and "-".',
      id: 'az+QCK',
      description: 'Logic app name validation message text',
    }),
    PROJECT_EXISTS_MESSAGE: intl.formatMessage({
      defaultMessage: 'A project with this name already exists in the workspace.',
      id: 'qXL3lS',
      description: 'A project with name already exists message text',
    }),
    LOGIC_APP_NAME_SAME: intl.formatMessage({
      defaultMessage: 'Logic app name cannot be the same as the function folder name.',
      id: '1jaOSf',
      description: 'Logic app name same as function folder name text',
    }),
  };

  const handleLogicAppTypeChange = (event: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    dispatch(setLogicAppType(data.value));
    if (data.value === 'rulesEngine') {
      dispatch(setTargetFramework('net472'));
    }
  };

  const validateLogicAppName = useCallback(
    (name: string) => {
      if (!name) {
        return intlText.EMPTY_LOGIC_APP_NAME;
      }
      if (!nameValidation.test(name)) {
        return intlText.LOGIC_APP_NAME_VALIDATION_MESSAGE;
      }
      // Check if function folder name is the same as logic app name
      if (functionFolderName && name.trim().toLowerCase() === functionFolderName.trim().toLowerCase()) {
        return intlText.LOGIC_APP_NAME_SAME;
      }

      // If custom code or rules engine is selected and the name is from the existing logic apps list, allow it
      const isCustomCodeOrRulesEngine = logicAppType === 'customCode' || logicAppType === 'rulesEngine';
      const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === name);

      if (isCustomCodeOrRulesEngine && isExistingLogicApp) {
        return undefined; // Valid - existing logic app for custom code/rules engine
      }

      // Check if the logic app name already exists in workspace folders (for new names)
      if (workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return intlText.PROJECT_EXISTS_MESSAGE;
      }
      return undefined;
    },
    [
      functionFolderName,
      intlText.EMPTY_LOGIC_APP_NAME,
      intlText.LOGIC_APP_NAME_SAME,
      intlText.LOGIC_APP_NAME_VALIDATION_MESSAGE,
      intlText.PROJECT_EXISTS_MESSAGE,
      logicAppType,
      logicAppsWithoutCustomCode,
      workspaceFileJson,
    ]
  );

  // Re-validate logic app name when dependencies change
  useEffect(() => {
    if (logicAppName) {
      setLogicAppNameError(validateLogicAppName(logicAppName));
    }
  }, [logicAppType, logicAppsWithoutCustomCode, workspaceFileJson, logicAppName, validateLogicAppName]);

  const handleLogicAppNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setLogicAppName(event.target.value));
    setLogicAppNameError(validateLogicAppName(event.target.value));
  };

  const handleComboboxOptionSelect = (_event: any, data: any) => {
    const value = data.optionValue || '';
    dispatch(setLogicAppName(value));
    setLogicAppNameError(validateLogicAppName(value));
  };

  const handleComboboxChange = (event: any) => {
    const value = event.target.value || '';
    dispatch(setLogicAppName(value));
    setLogicAppNameError(validateLogicAppName(value));
  };

  // Determine if we should show combobox (when custom code or rules engine is selected and logicAppsWithoutCustomCode is available)
  const shouldShowCombobox =
    (logicAppType === 'customCode' || logicAppType === 'rulesEngine') &&
    logicAppsWithoutCustomCode &&
    logicAppsWithoutCustomCode.length > 0;

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.TITLE}</Text>
      <Text className={styles.stepDescription}>{intlText.DESCRIPTION}</Text>

      <div className={styles.inputField}>
        <Field
          label={intlText.LOGIC_APP_NAME_LABEL}
          required
          validationState={logicAppNameError ? 'error' : undefined}
          validationMessage={logicAppNameError}
        >
          {shouldShowCombobox ? (
            <Combobox
              value={logicAppName}
              onOptionSelect={handleComboboxOptionSelect}
              onChange={handleComboboxChange}
              placeholder={intlText.LOGIC_APP_NAME_PLACEHOLDER}
              className={styles.inputControl}
              freeform
            >
              {logicAppsWithoutCustomCode.map((app: { label: string }) => (
                <Option key={app.label} value={app.label}>
                  {app.label}
                </Option>
              ))}
            </Combobox>
          ) : (
            <Input
              value={logicAppName}
              onChange={handleLogicAppNameChange}
              placeholder={intlText.LOGIC_APP_NAME_PLACEHOLDER}
              className={styles.inputControl}
            />
          )}
          {logicAppName && workspaceName && workspaceProjectPath.fsPath && (
            <Text
              size={200}
              style={{
                color: 'var(--colorNeutralForeground2)',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {`${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${logicAppName}`}
            </Text>
          )}
        </Field>
      </div>

      {shouldShowLogicAppSection && (
        <div>
          <RadioGroup value={logicAppType} onChange={handleLogicAppTypeChange} className={styles.radioGroup}>
            <div className={styles.radioOption}>
              <Radio value="logicApp" label={intlText.STANDARD_LABEL} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.STANDARD_DESCRIPTION}
              </Text>
            </div>
            <div className={styles.radioOption}>
              <Radio value="customCode" label={intlText.CUSTOM_CODE_LABEL} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.CUSTOM_CODE_DESCRIPTION}
              </Text>
            </div>
            <div className={styles.radioOption}>
              <Radio value="rulesEngine" label={intlText.RULES_ENGINE_LABEL} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.RULES_ENGINE_DESCRIPTION}
              </Text>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
