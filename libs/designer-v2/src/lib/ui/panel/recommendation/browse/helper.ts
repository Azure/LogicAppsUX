import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { a2aRequestOperation, getIntl, recurrenceOperation, requestOperation, agentOperation } from '@microsoft/logic-apps-shared';
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

const McpIcon = () =>
  React.createElement('img', {
    src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzIxODNfMjg5NjgpIj4KPHBhdGggZD0iTTI0IDBIMFYyNEgyNFYwWiIgZmlsbD0id2hpdGUiLz4KPG1hc2sgaWQ9Im1hc2swXzIxODNfMjg5NjgiIHN0eWxlPSJtYXNrLXR5cGU6bHVtaW5hbmNlIiBtYXNrVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiPgo8cGF0aCBkPSJNMjIgMkgyVjIySDIyVjJaIiBmaWxsPSJ3aGl0ZSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMjE4M18yODk2OCkiPgo8cGF0aCBkPSJNMjIgMkgyVjIySDIyVjJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE1LjA3MjIgMy45NTI0QzE0LjY2OTYgMy41NjA1NCAxNC4xMjk5IDMuMzQxMjcgMTMuNTY4IDMuMzQxMjdDMTMuMDA2MiAzLjM0MTI3IDEyLjQ2NjUgMy41NjA1NCAxMi4wNjM5IDMuOTUyNEw0LjA0MjIxIDExLjgxOTFDMy45MDc5NyAxMS45NDk1IDMuNzI4MTYgMTIuMDIyNSAzLjU0MDk2IDEyLjAyMjVDMy4zNTM3NiAxMi4wMjI1IDMuMTczOTQgMTEuOTQ5NSAzLjAzOTcxIDExLjgxOTFDMi45NzM5OSAxMS43NTUyIDIuOTIxNzUgMTEuNjc4NyAyLjg4NjA4IDExLjU5NDNDMi44NTA0MSAxMS41MDk4IDIuODMyMDMgMTEuNDE5MSAyLjgzMjAzIDExLjMyNzRDMi44MzIwMyAxMS4yMzU3IDIuODUwNDEgMTEuMTQ1IDIuODg2MDggMTEuMDYwNUMyLjkyMTc1IDEwLjk3NjEgMi45NzM5OSAxMC44OTk2IDMuMDM5NzEgMTAuODM1N0wxMS4wNjE0IDIuOTY5MDdDMTEuNzMyNCAyLjMxNjA2IDEyLjYzMTcgMS45NTA2OCAxMy41NjggMS45NTA2OEMxNC41MDQ0IDEuOTUwNjggMTUuNDAzNyAyLjMxNjA2IDE2LjA3NDcgMi45NjkwN0MxNi40NjMgMy4zNDY2NSAxNi43NTYzIDMuODEwODEgMTYuOTMwNyA0LjMyMzU2QzE3LjEwNTEgNC44MzYzIDE3LjE1NTYgNS4zODMwNiAxNy4wNzggNS45MTkwN0MxNy42MjEyIDUuODQxODIgMTguMTc0OCA1Ljg5MDMxIDE4LjY5NjIgNi4wNjA3OUMxOS4yMTc2IDYuMjMxMjggMTkuNjkzIDYuNTE5MjEgMjAuMDg1NSA2LjkwMjRMMjAuMTI3MiA2Ljk0NDA3QzIwLjQ1NTggNy4yNjM2MyAyMC43MTcgNy42NDU4NCAyMC44OTU0IDguMDY4MDhDMjEuMDczNyA4LjQ5MDMyIDIxLjE2NTYgOC45NDQwNCAyMS4xNjU2IDkuNDAyNEMyMS4xNjU2IDkuODYwNzcgMjEuMDczNyAxMC4zMTQ1IDIwLjg5NTQgMTAuNzM2N0MyMC43MTcgMTEuMTU5IDIwLjQ1NTggMTEuNTQxMiAyMC4xMjcyIDExLjg2MDdMMTIuODcyMiAxOC45NzQ5QzEyLjg1MDMgMTguOTk2MiAxMi44MzI5IDE5LjAyMTYgMTIuODIxIDE5LjA0OThDMTIuODA5MSAxOS4wNzc5IDEyLjgwMyAxOS4xMDgxIDEyLjgwMyAxOS4xMzg3QzEyLjgwMyAxOS4xNjkyIDEyLjgwOTEgMTkuMTk5NCAxMi44MjEgMTkuMjI3NUMxMi44MzI5IDE5LjI1NTcgMTIuODUwMyAxOS4yODExIDEyLjg3MjIgMTkuMzAyNEwxNC4zNjIyIDIwLjc2NDFDMTQuNDI3OSAyMC44MjggMTQuNDgwMiAyMC45MDQ0IDE0LjUxNTggMjAuOTg4OUMxNC41NTE1IDIxLjA3MzMgMTQuNTY5OSAyMS4xNjQxIDE0LjU2OTkgMjEuMjU1N0MxNC41Njk5IDIxLjM0NzQgMTQuNTUxNSAyMS40MzgxIDE0LjUxNTggMjEuNTIyNkMxNC40ODAyIDIxLjYwNyAxNC40Mjc5IDIxLjY4MzUgMTQuMzYyMiAyMS43NDc0QzE0LjIyOCAyMS44Nzc5IDE0LjA0ODIgMjEuOTUwOSAxMy44NjEgMjEuOTUwOUMxMy42NzM4IDIxLjk1MDkgMTMuNDkzOSAyMS44Nzc5IDEzLjM1OTcgMjEuNzQ3NEwxMS44Njk3IDIwLjI4NjZDMTEuNzE2MiAyMC4xMzc0IDExLjU5NDIgMTkuOTU5MSAxMS41MTA5IDE5Ljc2MkMxMS40Mjc2IDE5LjU2NDkgMTEuMzg0NyAxOS4zNTMgMTEuMzg0NyAxOS4xMzkxQzExLjM4NDcgMTguOTI1MSAxMS40Mjc2IDE4LjcxMzMgMTEuNTEwOSAxOC41MTYyQzExLjU5NDIgMTguMzE5MSAxMS43MTYyIDE4LjE0MDcgMTEuODY5NyAxNy45OTE2TDE5LjEyNDcgMTAuODc2NkMxOS4zMjE4IDEwLjY4NDggMTkuNDc4NCAxMC40NTU0IDE5LjU4NTMgMTAuMjAyMUMxOS42OTIzIDkuOTQ4NzUgMTkuNzQ3NCA5LjY3NjU1IDE5Ljc0NzQgOS40MDE1N0MxOS43NDc0IDkuMTI2NTggMTkuNjkyMyA4Ljg1NDM4IDE5LjU4NTMgOC42MDEwNEMxOS40Nzg0IDguMzQ3NzEgMTkuMzIxOCA4LjExODM3IDE5LjEyNDcgNy45MjY1N0wxOS4wODMgNy44ODU3M0MxOC42ODA4IDcuNDk0MjggMTguMTQxOSA3LjI3NTA0IDE3LjU4MDYgNy4yNzQ1N0MxNy4wMTk0IDcuMjc0MTEgMTYuNDgwMSA3LjQ5MjQ1IDE2LjA3NzIgNy44ODMyM0wxMC4xMDA1IDEzLjc0NDlMMTAuMDk4OSAxMy43NDY2TDEwLjAxNzIgMTMuODI3NEM5Ljg4Mjk0IDEzLjk1ODEgOS43MDI5NCAxNC4wMzEzIDkuNTE1NTQgMTQuMDMxM0M5LjMyODE1IDE0LjAzMTMgOS4xNDgxNSAxMy45NTgxIDkuMDEzODggMTMuODI3NEM4Ljk0ODE2IDEzLjc2MzUgOC44OTU5MiAxMy42ODcgOC44NjAyNSAxMy42MDI2QzguODI0NTggMTMuNTE4MiA4LjgwNjIgMTMuNDI3NCA4LjgwNjIgMTMuMzM1N0M4LjgwNjIgMTMuMjQ0MSA4LjgyNDU4IDEzLjE1MzMgOC44NjAyNSAxMy4wNjg5QzguODk1OTIgMTIuOTg0NCA4Ljk0ODE2IDEyLjkwOCA5LjAxMzg4IDEyLjg0NDFMMTUuMDc0NyA2Ljg5OTlDMTUuMjcxMiA2LjcwNzk3IDE1LjQyNzMgNi40Nzg2NiAxNS41MzM4IDYuMjI1NDZDMTUuNjQwMyA1Ljk3MjI2IDE1LjY5NTEgNS43MDAzMSAxNS42OTQ5IDUuNDI1NjJDMTUuNjk0NiA1LjE1MDk0IDE1LjYzOTQgNC44NzkwOCAxNS41MzI1IDQuNjI2MDZDMTUuNDI1NSA0LjM3MzA1IDE1LjI2OSA0LjE0Mzk5IDE1LjA3MjIgMy45NTI0WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNC4wNzE5IDUuOTE5MTRDMTQuMTM3NiA1Ljg1NTIyIDE0LjE4OTggNS43Nzg3OCAxNC4yMjU1IDUuNjk0MzNDMTQuMjYxMiA1LjYwOTg5IDE0LjI3OTYgNS41MTkxNCAxNC4yNzk2IDUuNDI3NDdDMTQuMjc5NiA1LjMzNTggMTQuMjYxMiA1LjI0NTA1IDE0LjIyNTUgNS4xNjA2QzE0LjE4OTggNS4wNzYxNiAxNC4xMzc2IDQuOTk5NzIgMTQuMDcxOSA0LjkzNThDMTMuOTM3NiA0LjgwNTA4IDEzLjc1NzYgNC43MzE5MyAxMy41NzAyIDQuNzMxOTNDMTMuMzgyOCA0LjczMTkzIDEzLjIwMjggNC44MDUwOCAxMy4wNjg2IDQuOTM1OEw3LjEzNjA1IDEwLjc1NDFDNi44MDc0NiAxMS4wNzM3IDYuNTQ2MjYgMTEuNDU1OSA2LjM2NzkxIDExLjg3ODFDNi4xODk1NSAxMi4zMDA0IDYuMDk3NjYgMTIuNzU0MSA2LjA5NzY2IDEzLjIxMjVDNi4wOTc2NiAxMy42NzA4IDYuMTg5NTUgMTQuMTI0NSA2LjM2NzkxIDE0LjU0NjhDNi41NDYyNiAxNC45NjkgNi44MDc0NiAxNS4zNTEyIDcuMTM2MDUgMTUuNjcwOEM3LjgwNzE3IDE2LjMyMzYgOC43MDY0OCAxNi42ODg5IDkuNjQyNzIgMTYuNjg4OUMxMC41NzkgMTYuNjg4OSAxMS40NzgzIDE2LjMyMzYgMTIuMTQ5NCAxNS42NzA4TDE4LjA4MjcgOS44NTI0N0MxOC4xNDg0IDkuNzg4NTYgMTguMjAwNyA5LjcxMjEyIDE4LjIzNjMgOS42Mjc2N0MxOC4yNzIgOS41NDMyMiAxOC4yOTA0IDkuNDUyNDggMTguMjkwNCA5LjM2MDhDMTguMjkwNCA5LjI2OTEzIDE4LjI3MiA5LjE3ODM5IDE4LjIzNjMgOS4wOTM5NEMxOC4yMDA3IDkuMDA5NDkgMTguMTQ4NCA4LjkzMzA1IDE4LjA4MjcgOC44NjkxNEMxNy45NDg0IDguNzM4NDEgMTcuNzY4NSA4LjY2NTI3IDE3LjU4MTEgOC42NjUyN0MxNy4zOTM3IDguNjY1MjcgMTcuMjEzNyA4LjczODQxIDE3LjA3OTQgOC44NjkxNEwxMS4xNDY5IDE0LjY4NzVDMTAuNzQ0MiAxNS4wNzkzIDEwLjIwNDYgMTUuMjk4NiA5LjY0MjcyIDE1LjI5ODZDOS4wODA4NyAxNS4yOTg2IDguNTQxMiAxNS4wNzkzIDguMTM4NTUgMTQuNjg3NUM3Ljk0MTUgMTQuNDk1NyA3Ljc4NDg3IDE0LjI2NjMgNy42Nzc5MyAxNC4wMTNDNy41NzA5OCAxMy43NTk3IDcuNTE1ODggMTMuNDg3NSA3LjUxNTg4IDEzLjIxMjVDNy41MTU4OCAxMi45Mzc1IDcuNTcwOTggMTIuNjY1MyA3LjY3NzkzIDEyLjQxMTlDNy43ODQ4NyAxMi4xNTg2IDcuOTQxNSAxMS45MjkzIDguMTM4NTUgMTEuNzM3NUwxNC4wNzE5IDUuOTE5MTRaIiBmaWxsPSJibGFjayIvPgo8L2c+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMjE4M18yODk2OCI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4=',
    alt: 'MCP',
    width: 24,
    height: 24,
  });

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
  visible?: boolean;
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
        defaultMessage: 'When an HTTP request is received',
        id: 'CAsrZ8',
        description: 'Manual trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Get started quickly',
        id: '4TXvXe',
        description: 'Manual trigger category description',
      }),
      icon: React.createElement(Play24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: requestOperation,
    },
    {
      key: 'schedule',
      text: intl.formatMessage({
        defaultMessage: 'On a schedule',
        id: 'F83QRP',
        description: 'Schedule trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Run from a recurring or custom schedule',
        id: 'lzM2NW',
        description: 'Schedule trigger category description',
      }),
      icon: React.createElement(Clock24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: recurrenceOperation,
    },
    {
      key: 'appEvent',
      text: intl.formatMessage({
        defaultMessage: 'From an app',
        id: 'wxZy/s',
        description: 'App event trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Events from apps or services',
        id: '5cR2cP',
        description: 'App event trigger category description',
      }),
      icon: React.createElement(Apps24Regular),
      type: BrowseCategoryType.BROWSE,
    },
    {
      key: 'azure',
      text: intl.formatMessage({
        defaultMessage: 'From Azure',
        id: 'w8dgiQ',
        description: 'Azure events trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Run based on events in Azure services',
        id: '/5vL6M',
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
        defaultMessage: 'When triggered by another workflow',
        id: '810OUB',
        description: 'Workflow execution trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When another logic app calls this workflow',
        id: 'mMysmk',
        description: 'Workflow execution trigger category description',
      }),
      icon: React.createElement(Share24Regular),
      type: BrowseCategoryType.IMMEDIATE,
      operation: requestOperation,
    },
    {
      key: 'chatMessage',
      text: intl.formatMessage({
        defaultMessage: 'Chat message',
        id: 'VTMWCv',
        description: 'Chat message trigger category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'When a message is received',
        id: 'YxH2JT',
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
        defaultMessage: 'When an evaluation or assessment process starts',
        id: '5wYM6C',
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
        defaultMessage: 'Other',
        id: 'TRpUKj',
        description: 'Other trigger methods category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Browse all available triggers',
        id: 'hh3i/V',
        description: 'Other trigger methods category description',
      }),
      icon: React.createElement(MoreHorizontal24Regular),
      type: BrowseCategoryType.BROWSE,
    },
  ];
};

export const getActionCategories = (allowAgents?: boolean, isAddingAgentTool?: boolean): BrowseCategoryConfig[] => {
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
      key: 'mcpServers',
      visible: isAddingAgentTool,
      text: intl.formatMessage({
        defaultMessage: 'MCP servers',
        id: 'pVNvTG',
        description: 'MCP servers category',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Invoke tools from MCP servers',
        id: '9LP9d3',
        description: 'MCP servers category description',
      }),
      icon: React.createElement(McpIcon),
      type: BrowseCategoryType.BROWSE,
      connectorFilters: {
        connectorIds: ['connectionProviders/mcpclient'],
      },
    },
    {
      key: 'aiAgent',
      visible: allowAgents,
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
      type: BrowseCategoryType.IMMEDIATE,
      operation: agentOperation,
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
