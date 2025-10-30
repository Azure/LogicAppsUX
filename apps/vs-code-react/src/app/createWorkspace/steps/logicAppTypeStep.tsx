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
import { useIntlMessages, workspaceMessages } from '../../../intl';
import { useSelector, useDispatch } from 'react-redux';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { nameValidation } from '../utils/validation';

export const LogicAppTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const intlText = useIntlMessages(workspaceMessages);
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

  const handleLogicAppTypeChange = (event: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    dispatch(setLogicAppType(data.value));
    if (data.value === 'rulesEngine') {
      dispatch(setTargetFramework('net472'));
    }
  };

  const validateLogicAppName = useCallback(
    (name: string) => {
      if (!name) {
        return intlText.LOGIC_APP_NAME_EMPTY;
      }
      if (!nameValidation.test(name)) {
        return intlText.LOGIC_APP_NAME_VALIDATION;
      }
      // Check if function folder name is the same as logic app name
      if (functionFolderName && name.trim().toLowerCase() === functionFolderName.trim().toLowerCase()) {
        return intlText.LOGIC_APP_NAME_SAME_AS_FUNCTION;
      }

      // If custom code or rules engine is selected and the name is from the existing logic apps list, allow it
      const isCustomCodeOrRulesEngine = logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine;
      const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === name);

      if (isCustomCodeOrRulesEngine && isExistingLogicApp) {
        return undefined; // Valid - existing logic app for custom code/rules engine
      }

      // Check if the logic app name already exists in workspace folders (for new names)
      if (workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return intlText.PROJECT_NAME_EXISTS;
      }
      return undefined;
    },
    [
      functionFolderName,
      intlText.LOGIC_APP_NAME_EMPTY,
      intlText.LOGIC_APP_NAME_SAME_AS_FUNCTION,
      intlText.LOGIC_APP_NAME_VALIDATION,
      intlText.PROJECT_NAME_EXISTS,
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
    (logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine) &&
    logicAppsWithoutCustomCode &&
    logicAppsWithoutCustomCode.length > 0;

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.LOGIC_APP_DETAILS}</Text>
      <Text className={styles.stepDescription}>{intlText.LOGIC_APP_DETAILS_DESCRIPTION}</Text>

      <div className={styles.inputField}>
        <Field
          label={intlText.LOGIC_APP_NAME}
          required
          validationState={logicAppNameError ? 'error' : undefined}
          validationMessage={logicAppNameError}
        >
          {shouldShowCombobox ? (
            <Combobox
              value={logicAppName}
              onOptionSelect={handleComboboxOptionSelect}
              onChange={handleComboboxChange}
              placeholder={intlText.ENTER_LOGIC_APP_NAME}
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
              placeholder={intlText.ENTER_LOGIC_APP_NAME}
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
              <Radio value={ProjectType.logicApp} label={intlText.LOGIC_APP_STANDARD} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.LOGIC_APP_STANDARD_DESCRIPTION}
              </Text>
            </div>
            <div className={styles.radioOption}>
              <Radio value={ProjectType.agentCodeful} label={intlText.CODEFUL_LABEL} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.CODEFUL_DESCRIPTION}
              </Text>
            </div>
            <div className={styles.radioOption}>
              <Radio value={ProjectType.customCode} label={intlText.LOGIC_APP_CUSTOM_CODE} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.LOGIC_APP_CUSTOM_CODE_DESCRIPTION}
              </Text>
            </div>
            <div className={styles.radioOption}>
              <Radio value={ProjectType.rulesEngine} label={intlText.LOGIC_APP_RULES_ENGINE} />
              <Text size={200} style={{ marginLeft: '24px', color: 'var(--colorNeutralForeground2)' }}>
                {intlText.LOGIC_APP_RULES_ENGINE_DESCRIPTION}
              </Text>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
