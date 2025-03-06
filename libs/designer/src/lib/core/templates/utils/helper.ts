import { type Template, getIntl, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../core';
import { summaryTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/summaryTab';
import { workflowTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/workflowTab';
import type { IntlShape } from 'react-intl';
import type { FilterObject } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import { validateParameterValueWithSwaggerType } from '../../../core/utils/validation';

export const getCurrentWorkflowNames = (workflows: { id: string; name: string }[], idToSkip: string): string[] => {
  return workflows.filter((w) => w.id !== idToSkip).map((w) => w.name) as string[];
};

export const getQuickViewTabs = (
  intl: IntlShape,
  dispatch: AppDispatch,
  workflowId: string,
  showCreate: boolean,
  { templateId, workflowAppName, isMultiWorkflow }: Template.TemplateContext,
  onCloseButtonClick?: () => void
) => {
  return [
    workflowTab(
      intl,
      dispatch,
      workflowId,
      showCreate,
      undefined,
      {
        templateId,
        workflowAppName,
        isMultiWorkflow,
      },
      onCloseButtonClick
    ),
    summaryTab(
      intl,
      dispatch,
      workflowId,
      showCreate,
      {
        templateId,
        workflowAppName,
        isMultiWorkflow,
      },
      onCloseButtonClick
    ),
  ];
};

export const getUniqueConnectors = (
  connections: Record<string, Template.Connection>,
  subscriptionId: string,
  location: string
): Template.Connection[] => {
  const allConnections = Object.values(connections);
  return getUniqueConnectorsFromConnections(allConnections, subscriptionId, location);
};

export const getUniqueConnectorsFromConnections = (
  allConnections: Template.Connection[],
  subscriptionId: string,
  location: string
): Template.Connection[] => {
  const result: Template.Connection[] = [];
  const finalConnectorIds: string[] = [];
  while (allConnections.length > 0) {
    const connection = allConnections.shift() as Template.Connection;
    const normalizedConnectorId = normalizeConnectorId(connection.connectorId, subscriptionId, location).toLowerCase();
    if (!finalConnectorIds.includes(normalizedConnectorId)) {
      finalConnectorIds.push(normalizedConnectorId);
      result.push({ ...connection, connectorId: normalizedConnectorId });
    }
  }

  return result;
};

const templateSearchOptions = {
  isCaseSensitive: false,
  includeScore: false,
  threshold: 0,
  ignoreLocation: true,
  keys: [
    {
      name: 'title',
      weight: 1,
      getFn: ([_name, template]: [string, Template.Manifest]) => template.title,
    },
    {
      name: 'description',
      weight: 1,
      getFn: ([_name, template]: [string, Template.Manifest]) => template.description,
    },
    {
      name: 'manifest',
      weight: 2,
      getFn: ([_name, template]: [string, Template.Manifest]) => [
        ...template.skus,
        ...(template.tags ?? []),
        ...(template.kinds ?? []),
        ...Object.values(template.details),
      ],
    },
    {
      name: 'parameters',
      weight: 3,
      getFn: ([_name, template]: [string, Template.Manifest]) =>
        template.parameters?.reduce((acc: string[], parameter) => acc.concat([parameter.displayName, parameter.description]), []),
    },
    {
      name: 'connections',
      weight: 3,
      getFn: ([_name, template]: [string, Template.Manifest]) =>
        template.connections
          ? Object.values(template.connections)?.reduce(
              (acc: string[], connection) => acc.concat([connection.connectorId.split('/').slice(-1)[0]]),
              []
            )
          : [],
    },
  ],
};

export const getFilteredTemplates = (
  templates: Record<string, Template.Manifest>,
  filters: {
    keyword?: string;
    sortKey: string;
    connectors?: FilterObject[];
    detailFilters: Record<string, FilterObject[]>;
  },
  isConsumption: boolean
): string[] => {
  const filteredTemplateEntries = Object.entries(templates).filter(([_templateName, templateManifest]) => {
    if (!templateManifest.skus.includes(isConsumption ? 'consumption' : 'standard')) {
      return false;
    }

    const hasConnectors =
      filters?.connectors?.some((connector) =>
        Object.values(templateManifest.connections)?.some(
          (connection) =>
            connector.value.split('/').slice(-1)[0].toLowerCase() === connection.connectorId.split('/').slice(-1)[0].toLowerCase()
        )
      ) ?? true;

    if (!hasConnectors) {
      return false;
    }

    const hasDetailFilters = Object.entries(filters.detailFilters).every(([filterName, filterItems]) => {
      const templateManifestDetailValue = templateManifest.details?.[filterName]?.split(',');
      if (!templateManifestDetailValue) {
        return false;
      }
      return filterItems.some((filterItem) => templateManifestDetailValue.includes(filterItem.value));
    });
    return hasDetailFilters;
  });

  if (filters.keyword) {
    const fuse = new Fuse(filteredTemplateEntries, templateSearchOptions);
    const searchedTemplateNames = fuse.search(filters.keyword).map(({ item }) => item[0]);

    return searchedTemplateNames;
  }

  const sortedFilteredTemplateEntries = _sortTemplateManifestEntriesByTitle(filters.sortKey, filteredTemplateEntries);
  return Object.keys(Object.fromEntries(sortedFilteredTemplateEntries));
};

const _sortTemplateManifestEntriesByTitle = (sortKey: string | undefined, templateManifestEntries: [string, Template.Manifest][]) => {
  switch (sortKey) {
    case 'a-to-z':
      return templateManifestEntries.sort(([_m1, manifest1], [_m2, manifest2]) =>
        manifest2?.title > manifest1?.title ? -1 : manifest2?.title < manifest1?.title ? 1 : 0
      );
    case 'z-to-a':
      return templateManifestEntries.sort(([_m1, manifest1], [_m2, manifest2]) =>
        manifest1?.title > manifest2?.title ? -1 : manifest1?.title < manifest2?.title ? 1 : 0
      );
    default:
      return templateManifestEntries;
  }
};

export const getConnectorResources = (intl: IntlShape) => {
  return {
    connected: intl.formatMessage({
      defaultMessage: 'Connected',
      id: 'msa0e1934a8168',
      description: 'Connected text',
    }),
    notConnected: intl.formatMessage({
      defaultMessage: 'Not connected',
      id: 'ms5b12497107c1',
      description: 'Not Connected text',
    }),
  };
};

export const validateParameterValue = (data: { type: string; value?: string }, required = true): string | undefined => {
  const intl = getIntl();

  const { value: valueToValidate, type } = data;

  if (valueToValidate === '' || valueToValidate === undefined) {
    if (!required) {
      return undefined;
    }
    return intl.formatMessage({
      defaultMessage: 'Must provide value for parameter.',
      id: 'ms54bf703aea55',
      description: 'Error message when the workflow parameter value is empty.',
    });
  }

  return validateParameterValueWithSwaggerType(type, valueToValidate, required, intl);
};

export const validateConnectionsValue = (
  manifestConnections: Record<string, Template.Connection>,
  connectionsMapping: Record<string, string>
): string | undefined => {
  const intl = getIntl();
  const errorMessage = intl.formatMessage({
    defaultMessage: 'All connections must be connected for workflow creation',
    id: 'ms7cd9494a142d',
    description: 'Error message to show when all connections are not connected',
  });

  return Object.keys(manifestConnections).some((connectionKey) => !connectionsMapping[connectionKey]) ? errorMessage : undefined;
};
