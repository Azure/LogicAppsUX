/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { useIntlMessages, workspaceMessages } from '../../../intl';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

export const ReviewCreateStep: React.FC = () => {
  const intlText = useIntlMessages(workspaceMessages);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;

  const {
    packagePath,
    workspaceProjectPath,
    workspaceName,
    logicAppType,
    targetFramework,
    functionFolderName,
    functionNamespace,
    functionName,
    workflowType,
    workflowName,
    logicAppName,
    flowType,
    logicAppsWithoutCustomCode,
    separator,
  } = createWorkspaceState;

  const needsDotNetFrameworkStep = logicAppType === ProjectType.customCode;
  const needsFunctionConfiguration = logicAppType === ProjectType.rulesEngine;

  // Determine if we're using an existing logic app
  const isUsingExistingLogicApp =
    (logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine) &&
    logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);

  // Determine what sections to show based on flow type
  const shouldShowPackageSection = flowType === 'createWorkspaceFromPackage';
  const shouldShowWorkspaceSection =
    flowType === 'createWorkspace' || flowType === 'convertToWorkspace' || flowType === 'createWorkspaceFromPackage';
  const shouldShowLogicAppSection =
    flowType === 'createWorkspace' || flowType === 'createLogicApp' || flowType === 'createWorkspaceFromPackage';
  const shouldShowWorkflowSection = (flowType === 'createWorkspace' || flowType === 'createLogicApp') && !isUsingExistingLogicApp;

  const getWorkspaceFilePath = () => {
    if (!workspaceProjectPath.fsPath || !workspaceName) {
      return '';
    }
    return `${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${workspaceName}.code-workspace`;
  };

  const getWorkspaceFolderPath = () => {
    if (!workspaceProjectPath.fsPath || !workspaceName) {
      return '';
    }
    return `${workspaceProjectPath.fsPath}${separator}${workspaceName}`;
  };

  const getLogicAppLocationPath = () => {
    if (!workspaceProjectPath.fsPath || !workspaceName || !logicAppName) {
      return '';
    }
    return `${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${logicAppName}`;
  };

  const getFunctionLocationPath = () => {
    if (!workspaceProjectPath.fsPath || !workspaceName || !functionFolderName) {
      return '';
    }
    return `${workspaceProjectPath.fsPath}${separator}${workspaceName}${separator}${functionFolderName}`;
  };

  const getDotNetFrameworkDisplay = (framework: string) => {
    switch (framework) {
      case 'net472':
        return '.NET Framework';
      case 'net8':
        return '.NET 8';
      default:
        return framework;
    }
  };

  const getLogicAppTypeDisplay = (type: string) => {
    switch (type) {
      case ProjectType.logicApp:
        return intlText.LOGIC_APP_STANDARD;
      case ProjectType.customCode:
        return intlText.LOGIC_APP_CUSTOM_CODE;
      case ProjectType.rulesEngine:
        return intlText.LOGIC_APP_RULES_ENGINE;
      default:
        return type || intlText.NOT_SPECIFIED;
    }
  };

  const getWorkflowTypeDisplay = (type: string) => {
    switch (type) {
      case 'Stateful-Codeless':
        return intlText.STATEFUL_TITLE;
      case 'Stateless-Codeless':
        return intlText.STATELESS_TITLE;
      case 'Agentic-Codeless':
        return intlText.AUTONOMOUS_TITLE;
      case 'Agent-Codeless':
        return intlText.AGENT_TITLE;
      default:
        return type || intlText.NOT_SPECIFIED;
    }
  };

  const renderSettingRow = (label: string, value: string, isRequired = true) => {
    const displayValue = value?.trim() || intlText.NOT_SPECIFIED;
    const isMissing = !value?.trim();

    return (
      <div className={styles.reviewRow} key={label}>
        <div className={styles.reviewLabel}>{label}:</div>
        <div className={`${styles.reviewValue} ${isMissing && isRequired ? styles.reviewValueMissing : ''}`}>{displayValue}</div>
      </div>
    );
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle}>{intlText.REVIEW_CREATE}</Text>
      <Text className={styles.stepDescription}>{intlText.REVIEW_DESCRIPTION}</Text>

      <div className={styles.reviewContainer}>
        {shouldShowPackageSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>{intlText.PACKAGE_SETUP}</div>
            {renderSettingRow(intlText.PACKAGE_PATH_REVIEW, packagePath.fsPath)}
          </div>
        )}

        {shouldShowWorkspaceSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>{intlText.PROJECT_SETUP}</div>
            {renderSettingRow(intlText.WORKSPACE_NAME_REVIEW, workspaceName)}
            {renderSettingRow(intlText.WORKSPACE_FOLDER, getWorkspaceFolderPath())}
            {renderSettingRow(intlText.WORKSPACE_FILE, getWorkspaceFilePath())}
          </div>
        )}

        {shouldShowLogicAppSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Logic app details</div>
            {renderSettingRow(intlText.LOGIC_APP_NAME_REVIEW, logicAppName)}
            {flowType !== 'createLogicApp' && renderSettingRow(intlText.LOGIC_APP_LOCATION, getLogicAppLocationPath())}
            {renderSettingRow(intlText.LOGIC_APP_TYPE_REVIEW, getLogicAppTypeDisplay(logicAppType))}
          </div>
        )}

        {needsDotNetFrameworkStep && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Custom code configuration</div>
            {renderSettingRow(intlText.DOTNET_FRAMEWORK_REVIEW, getDotNetFrameworkDisplay(targetFramework))}
            {renderSettingRow(intlText.CUSTOM_CODE_FOLDER, functionFolderName)}
            {renderSettingRow(intlText.CUSTOM_CODE_LOCATION, getFunctionLocationPath())}
            {renderSettingRow(intlText.FUNCTION_WORKSPACE, functionNamespace)}
            {renderSettingRow(intlText.FUNCTION_NAME_REVIEW, functionName)}
          </div>
        )}

        {needsFunctionConfiguration && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Function configuration</div>
            {renderSettingRow(intlText.RULES_ENGINE_FOLDER, functionFolderName)}
            {renderSettingRow(intlText.RULES_ENGINE_LOCATION, getFunctionLocationPath())}
            {renderSettingRow(intlText.FUNCTION_WORKSPACE, functionNamespace)}
            {renderSettingRow(intlText.FUNCTION_NAME_REVIEW, functionName)}
          </div>
        )}

        {shouldShowWorkflowSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Workflow configuration</div>
            {renderSettingRow(intlText.WORKFLOW_NAME_REVIEW, workflowName)}
            {renderSettingRow(intlText.WORKFLOW_TYPE_REVIEW, getWorkflowTypeDisplay(workflowType))}
          </div>
        )}
      </div>
    </div>
  );
};
