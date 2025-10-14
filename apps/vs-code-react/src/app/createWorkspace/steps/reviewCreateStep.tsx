/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import * as path from 'path';

export const ReviewCreateStep: React.FC = () => {
  const intl = useIntl();
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
  } = createWorkspaceState;

  const needsDotNetFrameworkStep = logicAppType === 'customCode';
  const needsFunctionConfiguration = logicAppType === 'rulesEngine';
  const separator = path.sep;

  // Determine if we're using an existing logic app
  const isUsingExistingLogicApp =
    (logicAppType === 'customCode' || logicAppType === 'rulesEngine') &&
    logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);

  // Determine what sections to show based on flow type
  const shouldShowPackageSection = flowType === 'createWorkspaceFromPackage';
  const shouldShowWorkspaceSection =
    flowType === 'createWorkspace' || flowType === 'convertToWorkspace' || flowType === 'createWorkspaceFromPackage';
  const shouldShowLogicAppSection =
    flowType === 'createWorkspace' || flowType === 'createLogicApp' || flowType === 'createWorkspaceFromPackage';
  const shouldShowWorkflowSection = (flowType === 'createWorkspace' || flowType === 'createLogicApp') && !isUsingExistingLogicApp;

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Review + Create',
      id: 'GH0CLv',
      description: 'Review and create step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Review your configuration and create your Logic App workspace.',
      id: 'XepQZn',
      description: 'Review step description',
    }),
    PROJECT_SETUP: intl.formatMessage({
      defaultMessage: 'Project Setup',
      id: 'mAeD3g',
      description: 'Project setup section title',
    }),
    PROJECT_PATH_LABEL: intl.formatMessage({
      defaultMessage: 'Project Path',
      id: 'ff1WLC',
      description: 'Project path label',
    }),
    PACKAGE_SETUP: intl.formatMessage({
      defaultMessage: 'Package Setup',
      id: '9VC1hu',
      description: 'Package setup section title',
    }),
    PACKAGE_PATH_LABEL: intl.formatMessage({
      defaultMessage: 'Package Path',
      id: '5H8ULg',
      description: 'Package path label',
    }),
    WORKSPACE_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace Name',
      id: 'Jbo5DB',
      description: 'Workspace name label',
    }),
    WORKSPACE_FOLDER_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace Folder',
      id: 'Eu6UGm',
      description: 'Workspace folder path label',
    }),
    WORKSPACE_FILE_LABEL: intl.formatMessage({
      defaultMessage: 'Workspace File',
      id: '+fM/eg',
      description: 'Workspace file path label',
    }),
    LOGIC_APP_TYPE_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App Type',
      id: 'n/eWQU',
      description: 'Logic app type label',
    }),
    LOGIC_APP_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App Name',
      id: 'i9+YCM',
      description: 'Logic app name label',
    }),
    LOGIC_APP_LOCATION_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App Location',
      id: 'zMexS3',
      description: 'Logic app location path label',
    }),
    DOTNET_FRAMEWORK_LABEL: intl.formatMessage({
      defaultMessage: '.NET Framework',
      id: 'kv8ROl',
      description: 'Dot net framework label',
    }),
    CUSTOM_CODE_FOLDER_LABEL: intl.formatMessage({
      defaultMessage: 'Custom Code Folder',
      id: 'LltDjL',
      description: 'Custom code folder label',
    }),
    RULES_ENGINE_FOLDER_LABEL: intl.formatMessage({
      defaultMessage: 'Rules Engine Folder',
      id: 'VE1WHE',
      description: 'Rules engine folder label',
    }),
    CUSTOM_CODE_LOCATION_LABEL: intl.formatMessage({
      defaultMessage: 'Custom Code Location',
      id: 'oOFc/f',
      description: 'Custom code location path label',
    }),
    RULES_ENGINE_LOCATION_LABEL: intl.formatMessage({
      defaultMessage: 'Rules Engine Location',
      id: 'YhPs4e',
      description: 'Rules Engine location path label',
    }),
    FUNCTION_WORKSPACE_LABEL: intl.formatMessage({
      defaultMessage: 'Function Workspace',
      id: 'aXShs8',
      description: 'Function workspace label',
    }),
    FUNCTION_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Function Name',
      id: '6I6s5I',
      description: 'Function name label',
    }),
    WORKFLOW_TYPE_LABEL: intl.formatMessage({
      defaultMessage: 'Workflow Type',
      id: 'JdYNQ+',
      description: 'Workflow type label',
    }),
    WORKFLOW_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Workflow Name',
      id: 'HC2d/m',
      description: 'Workflow name label',
    }),
    MISSING_VALUE: intl.formatMessage({
      defaultMessage: 'Not specified',
      id: 'KJLHaU',
      description: 'Missing value indicator',
    }),
  };

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
      case 'standard':
        return 'Standard Logic App';
      case 'customCode':
        return 'Logic App with Custom Code';
      case 'rulesEngine':
        return 'Logic App with Rules Engine';
      default:
        return type || intlText.MISSING_VALUE;
    }
  };

  const getWorkflowTypeDisplay = (type: string) => {
    switch (type) {
      case 'Stateful-Codeless':
        return 'Stateful';
      case 'Stateless-Codeless':
        return 'Stateless';
      case 'Agentic-Codeless':
        return 'Autonomous Agents (Preview)';
      case 'Agent-Codeless':
        return 'Conversational Agents (Preview)';
      default:
        return type || intlText.MISSING_VALUE;
    }
  };

  const renderSettingRow = (label: string, value: string, isRequired = true) => {
    const displayValue = value?.trim() || intlText.MISSING_VALUE;
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
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>
      <Text className={styles.stepDescription} style={{ display: 'block' }}>
        {intlText.DESCRIPTION}
      </Text>

      <div className={styles.reviewContainer}>
        {shouldShowPackageSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>{intlText.PACKAGE_SETUP}</div>
            {renderSettingRow(intlText.PACKAGE_PATH_LABEL, packagePath.fsPath)}
          </div>
        )}

        {shouldShowWorkspaceSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>{intlText.PROJECT_SETUP}</div>
            {renderSettingRow(intlText.WORKSPACE_NAME_LABEL, workspaceName)}
            {renderSettingRow(intlText.WORKSPACE_FOLDER_LABEL, getWorkspaceFolderPath())}
            {renderSettingRow(intlText.WORKSPACE_FILE_LABEL, getWorkspaceFilePath())}
          </div>
        )}

        {shouldShowLogicAppSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Logic App Details</div>
            {renderSettingRow(intlText.LOGIC_APP_NAME_LABEL, logicAppName)}
            {flowType !== 'createLogicApp' && renderSettingRow(intlText.LOGIC_APP_LOCATION_LABEL, getLogicAppLocationPath())}
            {renderSettingRow(intlText.LOGIC_APP_TYPE_LABEL, getLogicAppTypeDisplay(logicAppType))}
          </div>
        )}

        {needsDotNetFrameworkStep && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Custom Code Configuration</div>
            {renderSettingRow(intlText.DOTNET_FRAMEWORK_LABEL, getDotNetFrameworkDisplay(targetFramework))}
            {renderSettingRow(intlText.CUSTOM_CODE_FOLDER_LABEL, functionFolderName)}
            {renderSettingRow(intlText.CUSTOM_CODE_LOCATION_LABEL, getFunctionLocationPath())}
            {renderSettingRow(intlText.FUNCTION_WORKSPACE_LABEL, functionNamespace)}
            {renderSettingRow(intlText.FUNCTION_NAME_LABEL, functionName)}
          </div>
        )}

        {needsFunctionConfiguration && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Function Configuration</div>
            {renderSettingRow(intlText.RULES_ENGINE_FOLDER_LABEL, functionFolderName)}
            {renderSettingRow(intlText.RULES_ENGINE_LOCATION_LABEL, getFunctionLocationPath())}
            {renderSettingRow(intlText.FUNCTION_WORKSPACE_LABEL, functionNamespace)}
            {renderSettingRow(intlText.FUNCTION_NAME_LABEL, functionName)}
          </div>
        )}

        {shouldShowWorkflowSection && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionTitle}>Workflow Configuration</div>
            {renderSettingRow(intlText.WORKFLOW_NAME_LABEL, workflowName)}
            {renderSettingRow(intlText.WORKFLOW_TYPE_LABEL, getWorkflowTypeDisplay(workflowType))}
          </div>
        )}
      </div>
    </div>
  );
};
