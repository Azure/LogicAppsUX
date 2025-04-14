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
  ];
};

export const getUniqueConnectors = (
  connections: Record<string, Template.Connection>,
  subscriptionId: string,
  location: string
): Template.FeaturedConnector[] => {
  const allConnectors = Object.values(connections).map((connector) => ({ ...connector, id: connector.connectorId }));
  return getUniqueConnectorsFromConnections(allConnectors, subscriptionId, location);
};

export const getUniqueConnectorsFromConnections = (
  originalAllConnectors: Template.FeaturedConnector[],
  subscriptionId: string,
  location: string,
  removeBuiltInConnectors = false
): Template.FeaturedConnector[] => {
  const result: Template.FeaturedConnector[] = [];
  const finalConnectorIds: string[] = [];
  const allConnectors = [...originalAllConnectors];

  while (allConnectors.length > 0) {
    const connection = allConnectors.shift() as Template.FeaturedConnector;
    if (removeBuiltInConnectors && connection.kind === 'builtin') {
      continue;
    }
    const normalizedConnectorId = normalizeConnectorId(connection.id, subscriptionId, location).toLowerCase();
    if (!finalConnectorIds.includes(normalizedConnectorId)) {
      finalConnectorIds.push(normalizedConnectorId);
      result.push({ ...connection, id: normalizedConnectorId });
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
      name: 'id',
      weight: 1,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => template.id,
    },
    {
      name: 'title',
      weight: 1,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => template.title,
    },
    {
      name: 'tags',
      weight: 1,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => template.tags ?? [],
    },
    {
      name: 'summary',
      weight: 1,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => template.summary,
    },
    {
      name: 'workflowName',
      weight: 2,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => Object.values(template.workflows).map((w) => w.name),
    },
    {
      name: 'manifest',
      weight: 2,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) => [
        ...template.skus,
        ...(template.tags ?? []),
        ...Object.values(template.details),
      ],
    },
    {
      name: 'featuredConnectors',
      weight: 3,
      getFn: ([_name, template]: [string, Template.TemplateManifest]) =>
        (template.featuredConnectors ?? [])?.map((connector) => connector.id),
    },
  ],
};

export const getFilteredTemplates = (
  templates: Record<string, Template.TemplateManifest>,
  filters: {
    keyword?: string;
    sortKey: string;
    connectors?: FilterObject[];
    detailFilters: Record<Template.DetailsType, FilterObject[]>;
  },
  isConsumption: boolean
): string[] => {
  const filteredTemplateEntries = Object.entries(templates).filter(([_templateName, templateManifest]) => {
    if (!templateManifest.skus.includes(isConsumption ? 'consumption' : 'standard')) {
      return false;
    }

    const hasConnectors =
      filters?.connectors?.some((filterConnector) =>
        templateManifest?.featuredConnectors?.some(
          (featuredConnector) =>
            filterConnector.value.split('/').slice(-1)[0].toLowerCase() === featuredConnector.id.split('/').slice(-1)[0].toLowerCase()
        )
      ) ?? true;

    if (!hasConnectors) {
      return false;
    }

    const hasDetailFilters = Object.entries(filters.detailFilters).every(([filterName, filterItems]) => {
      const templateManifestDetailValue = templateManifest.details?.[filterName as Template.DetailsType]?.split(',');
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

const _sortTemplateManifestEntriesByTitle = (
  sortKey: string | undefined,
  templateManifestEntries: [string, Template.TemplateManifest][]
) => {
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

export const validateParameterValue = (data: { type: string; value?: string }, required = true): string | undefined => {
  const intl = getIntl();

  const { value: valueToValidate, type } = data;

  if (valueToValidate === '' || valueToValidate === undefined) {
    if (!required) {
      return undefined;
    }
    return intl.formatMessage({
      defaultMessage: 'Must provide value for parameter.',
      id: 'VL9wOu',
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
    id: 'fNlJSh',
    description: 'Error message to show when all connections are not connected',
  });

  return Object.keys(manifestConnections).some((connectionKey) => !connectionsMapping[connectionKey]) ? errorMessage : undefined;
};
