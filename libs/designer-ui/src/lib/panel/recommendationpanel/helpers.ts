import type { DiscoveryOperation, DiscoveryResultTypes, OperationRuntimeCategory } from '@microsoft/logic-apps-shared';
import { a2aRequestOperation, getIntl, recurrenceOperation, requestOperation } from '@microsoft/logic-apps-shared';
import { getConnectorCategoryString } from '../../utils';
import { isBuiltInConnector, isCustomConnector } from '../../connectors';
import type { OperationActionData } from './interfaces';
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
} from '@fluentui/react-icons';

export interface EnhancedOperationRuntimeCategory extends OperationRuntimeCategory {
  description: string;
  icon: React.ReactNode;
}

// Define trigger category configurations
export interface TriggerCategoryConfig {
  key: string;
  text: string;
  description: string;
  icon: React.ReactNode;
  type: 'immediate' | 'connector_browse' | 'operation_list';
  operations?: DiscoveryOperation<any>[];
  connectorFilters?: string[];
}

export const getDefaultRuntimeCategories = (): OperationRuntimeCategory[] => {
  const intl = getIntl();

  const all = intl.formatMessage({
    defaultMessage: 'All',
    id: '4mxRH9',
    description: 'Filter by All category of connectors',
  });

  const builtIn = intl.formatMessage({
    defaultMessage: 'Built-in',
    id: 'Vq9q5J',
    description: 'Filter by In App category of connectors',
  });

  const shared = intl.formatMessage({
    defaultMessage: 'Shared',
    id: '00xlpa',
    description: 'Filter by Shared category of connectors',
  });

  const custom = intl.formatMessage({
    defaultMessage: 'Custom',
    id: 'byTBrn',
    description: 'Filter by Custom category of connectors',
  });

  return [
    {
      key: 'all',
      text: all,
    },
    {
      key: 'inapp',
      text: builtIn,
    },
    {
      key: 'shared',
      text: shared,
    },
    {
      key: 'custom',
      text: custom,
    },
  ];
};

export const getActionCategories = (): EnhancedOperationRuntimeCategory[] => {
  const intl = getIntl();

  const aiAgentDescription = intl.formatMessage({
    defaultMessage: 'AI and machine learning capabilities',
    id: 'GR5+k2',
    description: 'AI Agent category description',
  });

  const actionInAppDescription = intl.formatMessage({
    defaultMessage: 'Connect to external services and applications',
    id: 'YqKlGx',
    description: 'Action in an app category description',
  });

  const dataTransformationDescription = intl.formatMessage({
    defaultMessage: 'Transform, parse, and manipulate data',
    id: 'Om9qyd',
    description: 'Data transformation category description',
  });

  const simpleOperationsDescription = intl.formatMessage({
    defaultMessage: 'Basic workflow controls and operations',
    id: 'VWd29W',
    description: 'Simple Operations category description',
  });

  const humanInTheLoopDescription = intl.formatMessage({
    defaultMessage: 'Manual approvals and user interactions',
    id: 'DT+e2k',
    description: 'Human in the loop category description',
  });

  return [
    {
      key: 'aiAgent',
      text: intl.formatMessage({
        defaultMessage: 'AI Agent',
        id: 'cQ/Ocu',
        description: 'Filter by AI Agent category of connectors',
      }),
      description: aiAgentDescription,
      icon: React.createElement(BotSparkle24Regular),
    },
    {
      key: 'actionInApp',
      text: intl.formatMessage({
        defaultMessage: 'Action in an app',
        id: 'FF5p6Q',
        description: 'Filter by Action in an app category of connectors',
      }),
      description: actionInAppDescription,
      icon: React.createElement(Apps24Regular),
    },
    {
      key: 'dataTransformation',
      text: intl.formatMessage({
        defaultMessage: 'Data transformation',
        id: 'tfuHEQ',
        description: 'Filter by Data transformation category of connectors',
      }),
      description: dataTransformationDescription,
      icon: React.createElement(Flow24Regular),
    },
    {
      key: 'simpleOperations',
      text: intl.formatMessage({
        defaultMessage: 'Simple Operations',
        id: 'uTTO2H',
        description: 'Filter by Simple Operations category of connectors',
      }),
      description: simpleOperationsDescription,
      icon: React.createElement(Settings24Regular),
    },
    {
      key: 'humanInTheLoop',
      text: intl.formatMessage({
        defaultMessage: 'Human in the loop',
        id: 'SbIePr',
        description: 'Filter by Human in the loop category of connectors',
      }),
      description: humanInTheLoopDescription,
      icon: React.createElement(People24Regular),
    },
  ];
};

export const getTriggerCategories = (): TriggerCategoryConfig[] => {
  const intl = getIntl();

  return [
    {
      key: 'manual',
      text: intl.formatMessage({
        defaultMessage: 'Trigger Manually',
        id: 'T1JBCn',
        description: 'Manual trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Start this workflow manually or via HTTP request',
        id: '/EOfWd',
        description: 'Manual trigger category description',
      }),
      icon: React.createElement(Play24Regular),
      type: 'immediate',
      operations: [requestOperation],
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
      type: 'connector_browse',
    },
    {
      key: 'schedule',
      text: intl.formatMessage({
        defaultMessage: 'On a Schedule',
        id: 'I547J5',
        description: 'Schedule trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Run on a recurring schedule or specific time',
        id: 'ozLfc+',
        description: 'Schedule trigger category description',
      }),
      icon: React.createElement(Clock24Regular),
      type: 'immediate',
      operations: [recurrenceOperation],
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
      type: 'connector_browse',
      connectorFilters: ['azure', 'servicebus', 'eventhub', 'eventgrid', 'storage', 'keyvault', 'monitor'],
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
      type: 'immediate',
      operations: [requestOperation],
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
      type: 'immediate',
      operations: [a2aRequestOperation],
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
      type: 'connector_browse',
      connectorFilters: ['powerplatform', 'dataverse'],
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
      type: 'connector_browse',
    },
  ];
};

export const getShouldUseSingleColumn = (clientWidth?: number): boolean => (clientWidth ?? 0) < 400;

export const getListHeight = (isSingleColumn: boolean): number => (isSingleColumn ? 800 : 400);

export const getOperationCardDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => {
  const { id, properties } = operation;
  const { summary: title, description, api, trigger, annotation, capabilities } = properties;

  return {
    id,
    title,
    description,
    brandColor: api.brandColor,
    iconUri: api.iconUri,
    connectorName: api.displayName,
    category: getConnectorCategoryString(api),
    isTrigger: capabilities?.includes('triggers') || !!trigger,
    isBuiltIn: isBuiltInConnector(api),
    isCustom: isCustomConnector(api),
    apiId: api.id,
    releaseStatus: annotation?.status,
  };
};

export const filterOperationData = (data: OperationActionData, filters?: Record<string, string>): boolean => {
  const actionType = filters?.['actionType'];
  if (!actionType || !data.id) {
    return true;
  }
  if (actionType === 'actions') {
    return !data.isTrigger;
  }
  if (actionType === 'triggers') {
    return !!data.isTrigger;
  }
  return true;
};
