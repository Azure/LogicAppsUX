import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { a2aRequestOperation, getIntl, recurrenceOperation, requestOperation } from '@microsoft/logic-apps-shared';
import React from 'react';
import {
  BotSparkle24Regular,
  Apps24Regular,
  Flow24Regular,
  Settings24Regular,
  People24Regular,
  Play24Regular,
  Clock24Regular,
  Cloud24Regular,
  Share24Regular,
  Chat24Regular,
  Target24Regular,
  MoreHorizontal24Regular,
  Star24Regular,
} from '@fluentui/react-icons';

export type BrowseCategoryType = 'immediate' | 'browse';

export const BrowseCategoryType = {
  IMMEDIATE: 'immediate' as BrowseCategoryType,
  BROWSE: 'browse' as BrowseCategoryType,
};

export interface ConnectorFilterTypes {
  name?: string[];
  connectorIds?: string[];
}

export interface BrowseCategoryConfig {
  key: string;
  text: string;
  description: string;
  icon: React.ReactNode;
  type: BrowseCategoryType;
  operation?: DiscoveryOperation<DiscoveryResultTypes>; // Only for Immediate
  connectorFilters?: ConnectorFilterTypes;
}

export const getTriggerCategories = (): BrowseCategoryConfig[] => {
  const intl = getIntl();

  return [
    {
      key: 'manual',
      text: intl.formatMessage({
        defaultMessage: 'Trigger manually',
        id: 'I+jX2I',
        description: 'Manual trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Start this workflow manually or via HTTP request',
        id: '/EOfWd',
        description: 'Manual trigger category description',
      }),
      icon: React.createElement(Play24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: requestOperation,
    },
    {
      key: 'appEvent',
      text: intl.formatMessage({
        defaultMessage: 'On app event',
        id: 'jC3F7G',
        description: 'App event trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When something happens in another app or service',
        id: '9jy2+E',
        description: 'App event trigger category description',
      }),
      icon: React.createElement(Apps24Regular),
      type: BrowseCategoryType.BROWSE,
    },
    {
      key: 'schedule',
      text: intl.formatMessage({
        defaultMessage: 'On a schedule',
        id: 'F83QRP',
        description: 'Schedule trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Run on a recurring schedule or specific time',
        id: 'ozLfc+',
        description: 'Schedule trigger category description',
      }),
      icon: React.createElement(Clock24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: recurrenceOperation,
    },
    {
      key: 'azure',
      text: intl.formatMessage({
        defaultMessage: 'On Azure events',
        id: 'iHC7AW',
        description: 'Azure events trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When something happens in Azure services',
        id: 'HoFPHB',
        description: 'Azure events trigger category description',
      }),
      icon: React.createElement(Cloud24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        name: ['azure', 'servicebus', 'eventhub', 'eventgrid', 'storage', 'keyvault', 'monitor'],
      },
    },
    {
      key: 'workflowExecution',
      text: intl.formatMessage({
        defaultMessage: 'When executed by another workflow',
        id: '7nbZbY',
        description: 'Workflow execution trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When this workflow is called by another Logic App',
        id: 'VIv1T8',
        description: 'Workflow execution trigger category description',
      }),
      icon: React.createElement(Share24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: requestOperation,
    },
    {
      key: 'chatMessage',
      text: intl.formatMessage({
        defaultMessage: 'On chat message',
        id: 'Yagnd2',
        description: 'Chat message trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When a message is received in Teams or other chat platforms',
        id: 'ZIAV4u',
        description: 'Chat message trigger category description',
      }),
      icon: React.createElement(Chat24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: a2aRequestOperation,
    },
    {
      key: 'evaluation',
      text: intl.formatMessage({
        defaultMessage: 'When running evaluation',
        id: 'uWLpFG',
        description: 'Evaluation trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When an evaluation or assessment process is triggered',
        id: 'dZKuKX',
        description: 'Evaluation trigger category description',
      }),
      icon: React.createElement(Target24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        name: ['powerplatform', 'dataverse'],
      },
    },
    {
      key: 'otherWays',
      text: intl.formatMessage({
        defaultMessage: 'Other ways...',
        id: 'YhGvTz',
        description: 'Other trigger methods category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Browse all available trigger connectors and services',
        id: 'sQmZcn',
        description: 'Other trigger methods category description',
      }),
      icon: React.createElement(MoreHorizontal24Regular),
      type: BrowseCategoryType.BROWSE,
    },
  ];
};

export const getActionCategories = (): BrowseCategoryConfig[] => {
  const intl = getIntl();

  return [
    {
      key: 'favorites',
      text: intl.formatMessage({
        defaultMessage: 'Favorites',
        id: 'HFt+tF',
        description: 'Favorites category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Your starred actions and connectors',
        id: 'YbOYXS',
        description: 'Favorites category description',
      }),
      icon: React.createElement(Star24Regular),
      type: BrowseCategoryType.BROWSE,
    },
    {
      key: 'aiAgent',
      text: intl.formatMessage({
        defaultMessage: 'AI Agent',
        id: 'cQ/Ocu',
        description: 'Filter by AI Agent category of connectors',
      }),
      description: intl.formatMessage({
        defaultMessage: 'AI and machine learning capabilities',
        id: 'GR5+k2',
        description: 'AI Agent category description',
      }),
      icon: React.createElement(BotSparkle24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        name: ['openai', 'azureai', 'cognitiveservices'],
      },
    },
    {
      key: 'actionInApp',
      text: intl.formatMessage({
        defaultMessage: 'Action in an app',
        id: 'FF5p6Q',
        description: 'Filter by Action in an app category of connectors',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Connect to external services and applications',
        id: 'YqKlGx',
        description: 'Action in an app category description',
      }),
      icon: React.createElement(Apps24Regular),
      type: BrowseCategoryType.BROWSE,
    },
    {
      key: 'dataTransformation',
      text: intl.formatMessage({
        defaultMessage: 'Data transformation',
        id: 'tfuHEQ',
        description: 'Filter by Data transformation category of connectors',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Transform, parse, and manipulate data',
        id: 'Om9qyd',
        description: 'Data transformation category description',
      }),
      icon: React.createElement(Flow24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        connectorIds: [
          'connectionProviders/variable',
          'connectionProviders/dataOperationNew',
          'connectionProviders/dataMapperOperations',
          'connectionProviders/inlineCode',
          'connectionProviders/xmlOperations',
          'connectionProviders/x12Operations',
        ],
      },
    },
    {
      key: 'simpleOperations',
      text: intl.formatMessage({
        defaultMessage: 'Simple Operations',
        id: 'uTTO2H',
        description: 'Filter by Simple Operations category of connectors',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Basic workflow controls and operations',
        id: 'VWd29W',
        description: 'Simple Operations category description',
      }),
      icon: React.createElement(Settings24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        connectorIds: [
          'connectionProviders/control',
          'connectionProviders/variable',
          'connectionProviders/http',
          'connectionProviders/localWorkflowOperation',
          'connectionProviders/request',
        ],
      },
    },
    {
      key: 'humanInTheLoop',
      text: intl.formatMessage({
        defaultMessage: 'Human in the loop',
        id: 'SbIePr',
        description: 'Filter by Human in the loop category of connectors',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Manual approvals and user interactions',
        id: 'DT+e2k',
        description: 'Human in the loop category description',
      }),
      icon: React.createElement(People24Regular),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        name: ['approval', 'teams', 'outlook', 'office365', 'sharepoint'],
        connectorIds: [
          'managedApis/approvals',
          'managedApis/teams',
          'managedApis/outlook',
          'managedApis/office365',
          'managedApis/sharepointonline',
          'managedApis/microsoftforms',
          'managedApis/planner',
          'managedApis/todo',
        ],
      },
    },
  ];
};
