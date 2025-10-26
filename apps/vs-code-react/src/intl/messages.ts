/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defineMessages } from 'react-intl';

/**
 * Centralized messages for vs-code-react application
 * All i18n strings should be defined here to avoid duplication
 */

export const commonMessages = defineMessages({
  SOMETHING_WENT_WRONG: {
    defaultMessage: 'Something went wrong',
    id: 'XtVOMn',
    description: 'Something went wrong text',
  },
  LOADING: {
    defaultMessage: 'Loading',
    id: 'WgJsL1',
    description: 'Loading text',
  },
  LOADING_DESIGNER: {
    defaultMessage: 'Loading designer',
    id: 'fZJWBR',
    description: 'Loading designer text',
  },
  CANCEL: {
    defaultMessage: 'Cancel',
    id: 'hHNj31',
    description: 'Cancel button text',
  },
  SAVE: {
    defaultMessage: 'Save',
    id: 'RT8KNi',
    description: 'Save button text',
  },
  NEXT: {
    defaultMessage: 'Next',
    id: 'vAdBMk',
    description: 'Next button text',
  },
  BACK: {
    defaultMessage: 'Back',
    id: 'WDROA9',
    description: 'Back button text',
  },
  BROWSE: {
    defaultMessage: 'Browse',
    id: 'swjISX',
    description: 'Browse button text',
  },
});

export const unitTestMessages = defineMessages({
  VIEW_WORKFLOW: {
    defaultMessage: 'View Workflow',
    id: 'SQfm69',
    description: 'View workflow button text',
  },
  TEST_ICON: {
    defaultMessage: 'Test Icon',
    id: 'GdcNCT',
    description: 'Test icon aria label',
  },
});

export const workspaceMessages = defineMessages({
  WORKFLOW_CONFIGURATION: {
    defaultMessage: 'Workflow Configuration',
    id: '81liT7',
    description: 'Workflow configuration step title',
  },
  WORKFLOW_NAME: {
    defaultMessage: 'Workflow Name',
    id: 'OwjR0o',
    description: 'Workflow name field label',
  },
  WORKFLOW_TYPE: {
    defaultMessage: 'Workflow Type',
    id: 'JdYNQ+',
    description: 'Workflow type label',
  },
  SELECT_WORKFLOW_TYPE: {
    defaultMessage: 'Select workflow type',
    id: '0H5p4k',
    description: 'Select workflow type placeholder',
  },
  ENTER_WORKFLOW_NAME: {
    defaultMessage: 'Enter workflow name',
    id: 'nVhDGu',
    description: 'Workflow name field placeholder',
  },
  WORKSPACE_NAME: {
    defaultMessage: 'Workspace Name',
    id: '2XYMMp',
    description: 'Workspace name field label',
  },
  PACKAGE_PATH: {
    defaultMessage: 'Package Path',
    id: 'CG6PPy',
    description: 'Package path field label',
  },
  PACKAGE_PATH_EMPTY: {
    defaultMessage: 'Package path cannot be empty',
    id: 'JrDiMJ',
    description: 'Package path empty validation message',
  },
  PACKAGE_PATH_NOT_EXISTS: {
    defaultMessage: 'Package path does not exist',
    id: 'TJ2HKX',
    description: 'Package path not exists validation message',
  },
  LOGIC_APP_TYPE: {
    defaultMessage: 'Logic App Type',
    id: 'n/eWQU',
    description: 'Logic app type label',
  },
  DOTNET_FRAMEWORK: {
    defaultMessage: '.NET Framework',
    id: 'vyBSec',
    description: '.NET framework label',
  },
  STATEFUL_TITLE: {
    defaultMessage: 'Stateful',
    id: 'p4Mgce',
    description: 'Stateful workflow option',
  },
  STATEFUL_DESCRIPTION: {
    defaultMessage: 'Optimized for high reliability, ideal for process business transitional data.',
    id: 'otRX33',
    description: 'Stateful workflow description',
  },
  STATELESS_TITLE: {
    defaultMessage: 'Stateless',
    id: 'R7gB/3',
    description: 'Stateless workflow option',
  },
  STATELESS_DESCRIPTION: {
    defaultMessage: 'Optimized for low latency, ideal for request-response and processing IoT events.',
    id: 'b0wO2+',
    description: 'Stateless workflow description',
  },
  AUTONOMOUS_TITLE: {
    defaultMessage: 'Autonomous Agents (Preview)',
    id: 'qs798U',
    description: 'Autonomous agents workflow option',
  },
  AUTONOMOUS_DESCRIPTION: {
    defaultMessage: 'All the benefits of Stateful, plus the option to build AI agents in your workflow to automate complex tasks.',
    id: 'Bft/H3',
    description: 'Autonomous agents workflow description',
  },
  AGENT_TITLE: {
    defaultMessage: 'Conversational Agents',
    id: 'fg89hL',
    description: 'Conversational agent workflow option',
  },
  AGENT_DESCRIPTION: {
    defaultMessage: 'Workflow that supports natural language, human interaction, and agents connected to LLMs',
    id: '+P+nuy',
    description: 'Conversational agents workflow description',
  },
  EMPTY_WORKFLOW_NAME: {
    defaultMessage: 'Workflow name cannot be empty.',
    id: 'jfWu9H',
    description: 'Workflow name empty text',
  },
  WORKFLOW_NAME_VALIDATION_MESSAGE: {
    defaultMessage: 'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".',
    id: 'V3DWT4',
    description: 'Workflow name validation message text',
  },
  // Package step messages
  PACKAGE_SETUP: {
    defaultMessage: 'Package Setup',
    id: 'Wxhsgj',
    description: 'Package setup step title',
  },
  PACKAGE: {
    defaultMessage: 'Package',
    id: 'aExfWG',
    description: 'Package setup step description',
  },
  PACKAGE_PATH_LABEL: {
    defaultMessage: 'Package Path',
    id: 'pyYxP0',
    description: 'Package path input label',
  },
  BROWSE_BUTTON: {
    defaultMessage: 'Browse...',
    id: 'cR0MlP',
    description: 'Browse folder button',
  },
  PACKAGE_PATH_EMPTY_MESSAGE: {
    defaultMessage: 'Package path cannot be empty.',
    id: 'pO1Zvz',
    description: 'Package path cannot be empty message text',
  },
  PATH_NOT_EXISTS: {
    defaultMessage: 'The specified path does not exist or is not accessible.',
    id: 'LgCmeY',
    description: 'Specified path does not exist or is not accessible message text',
  },
  // Project setup messages
  PROJECT_SETUP: {
    defaultMessage: 'Project Setup',
    id: 'blShaR',
    description: 'Project setup step title',
  },
  PROJECT_SETUP_DESCRIPTION: {
    defaultMessage: 'Configure your logic app workspace settings',
    id: 'JS4ajl',
    description: 'Project setup step description',
  },
  WORKSPACE_PARENT_FOLDER: {
    defaultMessage: 'Workspace Parent Folder Path',
    id: '3KYXwl',
    description: 'Workspace Parent Folder path input label',
  },
  WORKSPACE_NAME_LABEL: {
    defaultMessage: 'Workspace Name',
    id: 'uNvoPg',
    description: 'Workspace name input label',
  },
  WORKSPACE_PARENT_FOLDER_EMPTY: {
    defaultMessage: 'Workspace parent folder path cannot be empty.',
    id: 'VT6UoA',
    description: 'Workspace parent folder path cannot be empty message text',
  },
  WORKSPACE_NAME_EMPTY: {
    defaultMessage: 'Workspace name cannot be empty.',
    id: 'O2IxHR',
    description: 'Workspace name empty text',
  },
  WORKSPACE_NAME_VALIDATION: {
    defaultMessage: 'Workspace name must start with a letter and can only contain letters, digits, "_" and "-".',
    id: 'RRuHNc',
    description: 'Workspace name validation message text',
  },
  // Logic app details messages
  LOGIC_APP_DETAILS: {
    defaultMessage: 'Logic App Details',
    id: 'XJ1S7E',
    description: 'Logic app details step title',
  },
  LOGIC_APP_DETAILS_DESCRIPTION: {
    defaultMessage: 'Enter the logic app name and select the type of logic app to create',
    id: 'VPcN7p',
    description: 'Logic app details step description',
  },
  LOGIC_APP_NAME: {
    defaultMessage: 'Logic App Name',
    id: 'JS7xBY',
    description: 'Logic app name field label',
  },
  ENTER_LOGIC_APP_NAME: {
    defaultMessage: 'Enter logic app name',
    id: 'ceM0tn',
    description: 'Logic app name field placeholder',
  },
  LOGIC_APP_STANDARD: {
    defaultMessage: 'Logic App (Standard)',
    id: 'xnJNZH',
    description: 'Standard logic app option',
  },
  LOGIC_APP_STANDARD_DESCRIPTION: {
    defaultMessage: 'Standard logic app with built-in connectors and triggers',
    id: 'CfXSvL',
    description: 'Standard logic app description',
  },
  LOGIC_APP_CUSTOM_CODE: {
    defaultMessage: 'Logic App with Custom Code',
    id: '2ivADw',
    description: 'Logic app with custom code option',
  },
  LOGIC_APP_CUSTOM_CODE_DESCRIPTION: {
    defaultMessage: 'Logic app that allows custom code integration and advanced scenarios',
    id: 'kkKTEH',
    description: 'Logic app with custom code description',
  },
  LOGIC_APP_RULES_ENGINE: {
    defaultMessage: 'Logic App with Rules Engine',
    id: 'yoH8Yw',
    description: 'Logic app with rules engine option',
  },
  LOGIC_APP_RULES_ENGINE_DESCRIPTION: {
    defaultMessage: 'Logic app with built-in business rules engine for complex decision logic',
    id: 'Fsc9ZE',
    description: 'Logic app with rules engine description',
  },
  LOGIC_APP_NAME_EMPTY: {
    defaultMessage: 'Logic app name cannot be empty.',
    id: 'CBcl2V',
    description: 'Logic app name empty text',
  },
  LOGIC_APP_NAME_VALIDATION: {
    defaultMessage: 'Logic app name must start with a letter and can only contain letters, digits, "_" and "-".',
    id: 'az+QCK',
    description: 'Logic app name validation message text',
  },
  PROJECT_NAME_EXISTS: {
    defaultMessage: 'A project with this name already exists in the workspace.',
    id: 'qXL3lS',
    description: 'A project with name already exists message text',
  },
  LOGIC_APP_NAME_SAME_AS_FUNCTION: {
    defaultMessage: 'Logic app name cannot be the same as the function folder name.',
    id: '1jaOSf',
    description: 'Logic app name same as function folder name text',
  },
  // .NET Framework step messages
  CUSTOM_CODE_CONFIGURATION: {
    defaultMessage: 'Custom Code Configuration',
    id: 'um0VMI',
    description: 'Custom code configuration step title',
  },
  RULES_ENGINE_CONFIGURATION: {
    defaultMessage: 'Rules Engine Configuration',
    id: 'dTzRAM',
    description: 'Rules engine configuration step title',
  },
  CUSTOM_CODE_DESCRIPTION: {
    defaultMessage: 'Configure the settings for your custom code logic app',
    id: 'esTnYd',
    description: 'Custom code configuration step description',
  },
  DOTNET_VERSION: {
    defaultMessage: '.NET Version',
    id: 'Sc6upt',
    description: '.NET version dropdown label',
  },
  DOTNET_FRAMEWORK_OPTION: {
    defaultMessage: '.NET Framework',
    id: 'xQHAPW',
    description: '.NET Framework option',
  },
  DOTNET_FRAMEWORK_DESCRIPTION: {
    defaultMessage: 'Use the traditional .NET Framework for legacy compatibility',
    id: 'VLHQ4L',
    description: '.NET Framework description',
  },
  DOTNET_8: {
    defaultMessage: '.NET 8',
    id: 't2nswK',
    description: '.NET 8 option',
  },
  DOTNET_8_DESCRIPTION: {
    defaultMessage: 'Use the latest .NET 8 for modern development and performance',
    id: 'q1dxkD',
    description: '.NET 8 description',
  },
  FUNCTION_NAMESPACE: {
    defaultMessage: 'Function Namespace',
    id: '2XLzvL',
    description: 'Function namespace input label',
  },
  FUNCTION_NAME: {
    defaultMessage: 'Function Name',
    id: 'q8vsUq',
    description: 'Function name input label',
  },
  CUSTOM_CODE_FOLDER_NAME: {
    defaultMessage: 'Custom Code Folder Name',
    id: '6tG5dm',
    description: 'Custom code folder name input label',
  },
  RULES_ENGINE_FOLDER_NAME: {
    defaultMessage: 'Rules Engine Folder Name',
    id: 'jaa2Wl',
    description: 'Rules engine folder name input label',
  },
  SELECT_DOTNET_VERSION: {
    defaultMessage: 'Select .NET version',
    id: 'XEetXV',
    description: 'Select .NET version placeholder text',
  },
  FUNCTION_NAMESPACE_EMPTY: {
    defaultMessage: 'Function namespace cannot be empty.',
    id: 'ZY5ygq',
    description: 'Function namespace empty text',
  },
  FUNCTION_NAME_EMPTY: {
    defaultMessage: 'Function name cannot be empty.',
    id: 'MbFszg',
    description: 'Function name empty text',
  },
  FUNCTION_NAME_VALIDATION: {
    defaultMessage: 'Function name must start with a letter and can only contain letters, digits, "_" and "-".',
    id: 'DdAlJ9',
    description: 'Function name validation message text',
  },
  FUNCTION_FOLDER_NAME_EMPTY: {
    defaultMessage: 'Function folder name cannot be empty.',
    id: 'Vk1TBl',
    description: 'Function folder name empty text',
  },
  FUNCTION_FOLDER_NAME_VALIDATION: {
    defaultMessage: 'Function folder name must start with a letter and can only contain letters, digits, "_" and "-".',
    id: 'ZSRPr2',
    description: 'Function folder name validation message text',
  },
  FUNCTION_FOLDER_SAME_AS_LOGIC_APP: {
    defaultMessage: 'Function folder name cannot be the same as the logic app name.',
    id: '/kz09u',
    description: 'Function folder name same as logic app name text',
  },
  FUNCTION_FOLDER_EXISTS: {
    defaultMessage: 'A project with this name already exists in the workspace.',
    id: '7bhWPe',
    description: 'Function folder name exists in workspace text',
  },
  // Review step messages
  REVIEW_CREATE: {
    defaultMessage: 'Review + Create',
    id: 'GH0CLv',
    description: 'Review and create step title',
  },
  REVIEW_DESCRIPTION: {
    defaultMessage: 'Review your configuration and create your Logic App workspace.',
    id: 'XepQZn',
    description: 'Review step description',
  },
  PROJECT_SETUP_SECTION: {
    defaultMessage: 'Project Setup',
    id: 'mAeD3g',
    description: 'Project setup section title',
  },
  PROJECT_PATH: {
    defaultMessage: 'Project Path',
    id: 'ff1WLC',
    description: 'Project path label',
  },
  PACKAGE_SETUP_SECTION: {
    defaultMessage: 'Package Setup',
    id: '9VC1hu',
    description: 'Package setup section title',
  },
  PACKAGE_PATH_REVIEW: {
    defaultMessage: 'Package Path',
    id: '5H8ULg',
    description: 'Package path label',
  },
  WORKSPACE_NAME_REVIEW: {
    defaultMessage: 'Workspace Name',
    id: 'Jbo5DB',
    description: 'Workspace name label',
  },
  WORKSPACE_FOLDER: {
    defaultMessage: 'Workspace Folder',
    id: 'Eu6UGm',
    description: 'Workspace folder path label',
  },
  WORKSPACE_FILE: {
    defaultMessage: 'Workspace File',
    id: '+fM/eg',
    description: 'Workspace file path label',
  },
  LOGIC_APP_TYPE_REVIEW: {
    defaultMessage: 'Logic App Type',
    id: 'n/eWQU',
    description: 'Logic app type label',
  },
  LOGIC_APP_NAME_REVIEW: {
    defaultMessage: 'Logic App Name',
    id: 'i9+YCM',
    description: 'Logic app name label',
  },
  LOGIC_APP_LOCATION: {
    defaultMessage: 'Logic App Location',
    id: 'zMexS3',
    description: 'Logic app location path label',
  },
  DOTNET_FRAMEWORK_REVIEW: {
    defaultMessage: '.NET Framework',
    id: 'kv8ROl',
    description: 'Dot net framework label',
  },
  CUSTOM_CODE_FOLDER: {
    defaultMessage: 'Custom Code Folder',
    id: 'LltDjL',
    description: 'Custom code folder label',
  },
  RULES_ENGINE_FOLDER: {
    defaultMessage: 'Rules Engine Folder',
    id: 'VE1WHE',
    description: 'Rules engine folder label',
  },
  CUSTOM_CODE_LOCATION: {
    defaultMessage: 'Custom Code Location',
    id: 'oOFc/f',
    description: 'Custom code location path label',
  },
  RULES_ENGINE_LOCATION: {
    defaultMessage: 'Rules Engine Location',
    id: 'YhPs4e',
    description: 'Rules Engine location path label',
  },
  FUNCTION_WORKSPACE: {
    defaultMessage: 'Function Workspace',
    id: 'aXShs8',
    description: 'Function workspace label',
  },
  FUNCTION_NAME_REVIEW: {
    defaultMessage: 'Function Name',
    id: '6I6s5I',
    description: 'Function name label',
  },
  WORKFLOW_TYPE_REVIEW: {
    defaultMessage: 'Workflow Type',
    id: 'JdYNQ+',
    description: 'Workflow type label',
  },
  WORKFLOW_NAME_REVIEW: {
    defaultMessage: 'Workflow Name',
    id: 'HC2d/m',
    description: 'Workflow name label',
  },
  NOT_SPECIFIED: {
    defaultMessage: 'Not specified',
    id: 'KJLHaU',
    description: 'Missing value indicator',
  },
  // createWorkspace messages
  CREATE_WORKSPACE_FROM_PACKAGE: {
    defaultMessage: 'Create logic app workspace from package',
    id: 'RZZxs+',
    description: 'Create logic app workspace from package text.',
  },
  CREATE_WORKSPACE: {
    defaultMessage: 'Create logic app workspace',
    id: 'eagv8j',
    description: 'Create logic app workspace text.',
  },
  CREATE_PROJECT: {
    defaultMessage: 'Create Project',
    id: 'RmJRES',
    description: 'Create logic app project text.',
  },
  CREATE_PROJECT_BUTTON: {
    defaultMessage: 'Create project',
    id: 'u+VFmh',
    description: 'Create logic app project button',
  },
  CREATE_WORKSPACE_BUTTON: {
    defaultMessage: 'Create Workspace',
    id: 'XZfauP',
    description: 'Create workspace button',
  },
  CREATING_PACKAGE: {
    defaultMessage: 'Creating...',
    id: 'e8iBzO',
    description: 'Creating workspace from package in progress',
  },
  CREATING_WORKSPACE: {
    defaultMessage: 'Creating...',
    id: 'k6MqI+',
    description: 'Creating workspace in progress',
  },
  WORKSPACE_PACKAGE_CREATED: {
    defaultMessage: 'Workspace From Package Created Successfully!',
    id: 'vDfUt4',
    description: 'Workspace from package creation success message',
  },
  LOGIC_APP_CREATED: {
    defaultMessage: 'Logic App Created Successfully!',
    id: '8bXaOe',
    description: 'Logic app creation success message',
  },
  WORKSPACE_CREATED: {
    defaultMessage: 'Workspace Created Successfully!',
    id: '4fdozy',
    description: 'Workspace creation success message',
  },
  WORKSPACE_PACKAGE_CREATED_DESCRIPTION: {
    defaultMessage: 'Your logic app workspace from package has been created is ready to use.',
    id: 'rGWwuB',
    description: 'Workspace package creation success description',
  },
  LOGIC_APP_CREATED_DESCRIPTION: {
    defaultMessage: 'Your logic app has been created and is ready to use.',
    id: 'ECHpxE',
    description: 'Logic app creation success description',
  },
  WORKSPACE_CREATED_DESCRIPTION: {
    defaultMessage: 'Your logic app workspace has been created and is ready to use.',
    id: 'OdrYKo',
    description: 'Workspace creation success description',
  },
  LOGIC_APP_SETUP: {
    defaultMessage: 'Logic App Setup',
    id: 'dELTC6',
    description: 'Logic App setup step label',
  },
  PROJECT_SETUP_LABEL: {
    defaultMessage: 'Project Setup',
    id: '1d8W/S',
    description: 'Project setup step label',
  },
  REVIEW_CREATE_LABEL: {
    defaultMessage: 'Review + Create',
    id: '4dze5/',
    description: 'Review and create step label',
  },
});

export const exportMessages = defineMessages({
  EXPORT_TITLE: {
    defaultMessage: 'Export',
    id: 'u2mduv',
    description: 'Export page title',
  },
  EXPORT_LOGIC_APP: {
    defaultMessage: 'Export logic app',
    id: 'idw/7j',
    description: 'Export logic app text.',
  },
  EXPORT_STATUS_TITLE: {
    defaultMessage: 'Status',
    id: 'Wwf+Ju',
    description: 'Export status title',
  },
  INSTANCE_SELECTION: {
    defaultMessage: 'Instance Selection',
    id: 'SqCSry',
    description: 'Instance selection step title',
  },
  WORKFLOWS_SELECTION: {
    defaultMessage: 'Workflows Selection',
    id: 'PZP0C6',
    description: 'Workflows selection step title',
  },
  VALIDATION: {
    defaultMessage: 'Validation',
    id: 'IACzZz',
    description: 'Validation step title',
  },
  SUMMARY: {
    defaultMessage: 'Summary',
    id: '6HztdX',
    description: 'Summary step title',
  },
  STATUS: {
    defaultMessage: 'Status',
    id: 'YgfV/C',
    description: 'Status step title',
  },
  MANAGED_CONNECTIONS: {
    defaultMessage: 'Managed Connections',
    id: 'oW5gC2',
    description: 'Managed connections label',
  },
  NEW_RESOURCE_GROUP: {
    defaultMessage: 'New Resource Group',
    id: '5VWnyg',
    description: 'New resource group label',
  },
  // Instance Selection
  DIVIDER_ISE: {
    defaultMessage: 'Integration Service Environment',
    id: '1HWJiJ',
    description: 'ISE divider label',
  },
  DIVIDER_REGIONS: {
    defaultMessage: 'Regions',
    id: 'mMivmV',
    description: 'Regions divider label',
  },
  SELECT_OPTION: {
    defaultMessage: 'Select an option',
    id: 'XPBoDw',
    description: 'Select option placeholder',
  },
  EMPTY_SUBSCRIPTION: {
    defaultMessage: 'No subscriptions available',
    id: '8m5+M9',
    description: 'Empty subscription message',
  },
  EMPTY_LOCATION: {
    defaultMessage: 'No locations available',
    id: 'gxHe8n',
    description: 'Empty location message',
  },
  SELECT_TITLE: {
    defaultMessage: 'Select Subscription and Location',
    id: 'SNZuzc',
    description: 'Selection title',
  },
  SELECT_DESCRIPTION: {
    defaultMessage: 'Choose your target subscription and location',
    id: '+zIx77',
    description: 'Selection description',
  },
  SELECTION_SUBSCRIPTION: {
    defaultMessage: 'Subscription',
    id: 'cuLdXe',
    description: 'Subscription label',
  },
  SELECTION_LOCATION: {
    defaultMessage: 'Location',
    id: 'IpUfon',
    description: 'Location label',
  },
  // Navigation
  EXPORT_WITH_WARNINGS: {
    defaultMessage: 'Export with warnings',
    id: 'pK0Ir8',
    description: 'Export with warnings button',
  },
  EXPORT: {
    defaultMessage: 'Export',
    id: 'wPzyvX',
    description: 'Export button',
  },
  NEXT: {
    defaultMessage: 'Next',
    id: '3Wcqsy',
    description: 'Next button',
  },
  BACK: {
    defaultMessage: 'Back',
    id: '2XH9oW',
    description: 'Back button',
  },
  CANCEL_LABEL: {
    defaultMessage: 'Cancel',
    id: 'qz9XeG',
    description: 'Cancel button',
  },
  FINISH: {
    defaultMessage: 'Finish',
    id: '+AFyLk',
    description: 'Finish button',
  },
  // Summary
  COMPLETE_EXPORT_TITLE: {
    defaultMessage: 'Complete Export',
    id: 'NaPoi1',
    description: 'Complete export title',
  },
  SELECT_LOCATION: {
    defaultMessage: 'Select Location',
    id: '3dlAS3',
    description: 'Select location label',
  },
  OPEN_FILE_EXPLORER: {
    defaultMessage: 'Open in File Explorer',
    id: 'Xr3/0R',
    description: 'Open file explorer button',
  },
  EXPORT_LOCATION: {
    defaultMessage: 'Export Location',
    id: '2aUXAB',
    description: 'Export location label',
  },
  DEPLOY_MANAGED_CONNECTIONS: {
    defaultMessage: 'Deploy Managed Connections',
    id: 'DdGGOf',
    description: 'Deploy managed connections label',
  },
  ADDITIONAL_STEPS: {
    defaultMessage: 'Additional Steps',
    id: 'ZeKveh',
    description: 'Additional steps label',
  },
  AFTER_EXPORT: {
    defaultMessage: 'After Export',
    id: 'EqEOfJ',
    description: 'After export label',
  },
  RESOURCE_GROUP: {
    defaultMessage: 'Resource Group',
    id: 'MBVt3v',
    description: 'Resource group label',
  },
  // Validation
  WORKFLOW_GROUP_DISPLAY_NAME: {
    defaultMessage: 'Workflows',
    id: 'bbFMfd',
    description: 'Workflow group display name',
  },
  REVIEW_TITLE: {
    defaultMessage: 'Review and Validate',
    id: 'yen5zR',
    description: 'Review title',
  },
  REVIEW_DESCRIPTION: {
    defaultMessage: 'Review your export configuration',
    id: 'S4Bx4M',
    description: 'Review description',
  },
  // Workflows Selection
  ADVANCED_OPTIONS: {
    defaultMessage: 'Advanced Options',
    id: 'XWiV58',
    description: 'Advanced options label',
  },
  EXPORT_CONNECTION: {
    defaultMessage: 'Export Connections',
    id: 'SLqL6b',
    description: 'Export connection label',
  },
  EXPORT_CONNECTION_DESCRIPTION: {
    defaultMessage: 'Include connection configurations in export',
    id: '2yO/M6',
    description: 'Export connection description',
  },
  GENERATE_INFRAESTRUCTURE: {
    defaultMessage: 'Generate Infrastructure Files',
    id: 'Aa7uzA',
    description: 'Generate infrastructure label',
  },
  CLONE_CONNECTIONS: {
    defaultMessage: 'Clone Connections',
    id: '6GWFpj',
    description: 'Clone connections label',
  },
  INTEGRATION_ACCOUNT_SOURCE: {
    defaultMessage: 'Integration Account Source',
    id: 'thBJtN',
    description: 'Integration account source label',
  },
  EXPORT_CUSTOM_API_ACTIONS_TO_API_MANAGEMENT_ACTIONS: {
    defaultMessage: 'Export Custom API Actions to API Management',
    id: '8lzYOU',
    description: 'Export custom API actions label',
  },
  SELECT_WORKFLOW: {
    defaultMessage: 'Select Workflows',
    id: 'VSh4X/',
    description: 'Select workflow label',
  },
  SELECTED_APPS: {
    defaultMessage: 'Selected Apps',
    id: 'lbmbiZ',
    description: 'Selected apps label',
  },
  SELECTION_ALL: {
    defaultMessage: 'Select All',
    id: 'zEe0+Q',
    description: 'Select all label',
  },
  NO_WORKFLOWS: {
    defaultMessage: 'No workflows available',
    id: 'mygEMn',
    description: 'No workflows message',
  },
  NO_DETAILS: {
    defaultMessage: 'No details available',
    id: '1xa4kY',
    description: 'No details message',
  },
  NAME: {
    defaultMessage: 'Name',
    id: 'gOkIvb',
    description: 'Name label',
  },
  SHIMMER_LABEL: {
    defaultMessage: 'Loading...',
    id: '0rJ6RJ',
    description: 'Shimmer loading label',
  },
  LIMIT_INFO: {
    defaultMessage: 'Limit reached',
    id: 'ooIa6F',
    description: 'Limit info message',
  },
  PACKAGE_WARNING: {
    defaultMessage: 'Package warning',
    id: 'HuWIbw',
    description: 'Package warning message',
  },
  SEARCH_LOGIC_APP: {
    defaultMessage: 'Search logic app',
    id: 'MMtjUW',
    description: 'Search logic app placeholder',
  },
  SEARCH: {
    defaultMessage: 'Search',
    id: 'ZtLSVc',
    description: 'Search label',
  },
  FILTER_RESOURCE_GROUPS: {
    defaultMessage: 'Filter by resource group',
    id: 'MDmYah',
    description: 'Filter resource groups label',
  },
});

export const designerMessages = defineMessages({
  CODE_VIEW: {
    defaultMessage: 'Code View',
    id: 'nlIckx',
    description: 'Code view label',
  },
  DESIGNER_VIEW: {
    defaultMessage: 'Designer View',
    id: 'kVs+EH',
    description: 'Designer view label',
  },
  SPLIT_VIEW: {
    defaultMessage: 'Split View',
    id: 'QVx5EI',
    description: 'Split view label',
  },
  FILE_BUG: {
    defaultMessage: 'File a bug',
    id: 'Tpkwuu',
    description: 'File a bug button',
  },
  SAVE: {
    defaultMessage: 'Save',
    id: '+itf/D',
    description: 'Save button',
  },
  DISCARD: {
    defaultMessage: 'Discard',
    id: '8VlCa0',
    description: 'Discard button',
  },
  PARAMETERS: {
    defaultMessage: 'Parameters',
    id: 'izUiSp',
    description: 'Parameters button',
  },
  CONNECTIONS: {
    defaultMessage: 'Connections',
    id: '9nAAU/',
    description: 'Connections button',
  },
  ERRORS: {
    defaultMessage: 'Errors',
    id: 'gHm7zV',
    description: 'Errors button',
  },
  REFRESH: {
    defaultMessage: 'Refresh',
    id: 'rREwxg',
    description: 'Refresh button',
  },
  RESUBMIT: {
    defaultMessage: 'Resubmit',
    id: 'WkfjIG',
    description: 'Resubmit button',
  },
  KEYBOARD_NAV_HINT: {
    defaultMessage: 'Use left and right arrow keys to navigate between commands',
    id: '4y9tHO',
    description: 'Keyboard navigation hint',
  },
  CREATE_UNIT_TEST: {
    defaultMessage: 'Create unit test from run',
    id: '/a0bAT',
    description: 'Create unit test button',
  },
  SAVE_UNIT_TEST: {
    defaultMessage: 'Save unit test definition',
    id: 'VfUtlo',
    description: 'Save unit test button',
  },
  UNIT_TEST_ASSERTIONS: {
    defaultMessage: 'Assertions',
    id: 'LG7hSo',
    description: 'Unit test assertions button',
  },
  COMMAND_BAR_ARIA: {
    defaultMessage: 'Use left and right arrow keys to navigate between commands',
    id: 'UCYBt4',
    description: 'Command bar aria label',
  },
  CHAT_BUTTON_TOOLTIP_CONTENT: {
    defaultMessage: 'Chat with AI',
    id: 'JBRP7/',
    description: 'Chat button tooltip content',
  },
});

export const overviewMessages = defineMessages({
  OVERVIEW: {
    defaultMessage: 'Overview',
    id: '3H+PIM',
    description: 'Overview page title',
  },
});
