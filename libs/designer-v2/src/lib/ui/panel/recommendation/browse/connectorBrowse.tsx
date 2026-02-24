import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../../core/queries/browse';
import { useDiscoveryPanelRelationshipIds } from '../../../../core/state/panel/panelSelectors';
import { useIsA2AWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { equals, getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector, isCustomConnector } from '@microsoft/designer-ui';
import { Text, Spinner } from '@fluentui/react-components';
import { ALLOWED_A2A_CONNECTOR_NAMES } from '../helpers';
import { ConnectorCard } from './connectorCard';
import { selectOperationGroupId } from '../../../../core/state/panel/panelSlice';
import type { AppDispatch } from '../../../../core';
import { useConnectorBrowseStyles } from './styles/ConnectorBrowse.styles';
import { List, type RowComponentProps } from 'react-window';
import type { ConnectorFilterTypes } from './helper';

export interface ConnectorBrowseProps {
  categoryKey: string;
  onConnectorSelected?: (connectorId: string, origin?: string) => void;
  connectorFilters?: ConnectorFilterTypes;
  filters?: Record<string, string>;
  displayRuntimeInfo?: boolean;
}

const priorityConnectors = [
  'managedApis/office365',
  'managedApis/sharepointonline',
  'managedApis/teams',
  'managedApis/onedriveforbusiness',
  'managedApis/outlook',
  'managedApis/dynamics365',
  'managedApis/salesforce',
  'managedApis/sql',
  'managedApis/azureblob',
  'managedApis/filesystem',
];

const defaultFilterConnector = (connector: Connector, runtimeFilter: string): boolean => {
  if (runtimeFilter === 'inapp' && !isBuiltInConnector(connector)) {
    return false;
  }
  if (runtimeFilter === 'custom' && !isCustomConnector(connector)) {
    return false;
  }
  if (runtimeFilter === 'shared' && (isBuiltInConnector(connector) || isCustomConnector(connector))) {
    return false;
  }
  return true;
};

const RUNTIME_VALUE_BUILTIN = 100;
const RUNTIME_VALUE_CUSTOM = 200;
const RUNTIME_VALUE_SHARED = 300;

const getRunTimeValue = (connector: Connector): number => {
  if (isBuiltInConnector(connector)) {
    return RUNTIME_VALUE_BUILTIN;
  }
  if (isCustomConnector(connector)) {
    return RUNTIME_VALUE_CUSTOM;
  }
  return RUNTIME_VALUE_SHARED;
};
const getPriorityValue = (connector: Connector): number => {
  const idx = priorityConnectors.findIndex((p) => connector.id.toLowerCase().endsWith(p.toLowerCase()));
  return idx !== -1 ? 200 - idx : 100;
};

const defaultSortConnectors = (connectors: Connector[]): Connector[] => {
  return [...connectors].sort(
    (a, b) =>
      getPriorityValue(b) - getPriorityValue(a) ||
      getRunTimeValue(a) - getRunTimeValue(b) ||
      (a.properties.displayName?.localeCompare(b.properties.displayName) ?? 0)
  );
};

export const ConnectorBrowse = ({
  categoryKey,
  onConnectorSelected,
  connectorFilters,
  filters = {},
  displayRuntimeInfo = false,
}: ConnectorBrowseProps) => {
  const intl = useIntl();
  const classes = useConnectorBrowseStyles();
  const dispatch = useDispatch<AppDispatch>();
  const isA2AWorkflow = useIsA2AWorkflow();
  const isAddingToGraph = useDiscoveryPanelRelationshipIds().graphId === 'root';

  const { data: allConnectors, isLoading } = useAllConnectors();

  const isAgentConnectorAllowed = useCallback((c: Connector) => c.id !== 'connectionProviders/agent', []);
  const isACASessionAllowed = useCallback((c: Connector) => c.id !== '/serviceProviders/acasession', []);

  const passesRuntimeFilter = useCallback(
    (c: Connector) => {
      const runtimeFilter = getRecordEntry(filters, 'runtime');
      return runtimeFilter ? defaultFilterConnector(c, runtimeFilter) : true;
    },
    [filters]
  );

  const passesActionTypeFilter = useCallback(
    (c: Connector) => {
      const actionType = getRecordEntry(filters, 'actionType')?.toLowerCase();
      if (!actionType) {
        return true;
      }
      const caps = c.properties?.capabilities ?? [];
      if (caps.length === 0) {
        return true;
      }
      if (!caps.includes('actions') && !caps.includes('triggers')) {
        return true;
      }
      return actionType === 'triggers' ? caps.includes('triggers') : caps.includes('actions');
    },
    [filters]
  );

  const passesA2AWorkflowFilter = useCallback(
    (c: Connector) => {
      if (!isA2AWorkflow || !isAddingToGraph) {
        return true;
      }
      if (c.name && ALLOWED_A2A_CONNECTOR_NAMES.has(c.name)) {
        return true;
      }
      return equals(c.type, 'Microsoft.Web/locations/managedApis') || equals(c.type, 'ServiceProvider');
    },
    [isA2AWorkflow, isAddingToGraph]
  );

  const passesCategoryFilter = useCallback(
    (c: Connector) => {
      if (categoryKey === 'otherWays' || (!connectorFilters?.name?.length && !connectorFilters?.connectorIds?.length)) {
        return true;
      }

      // Check connector IDs first (exact match)
      if (connectorFilters?.connectorIds?.length) {
        const matchesById = connectorFilters.connectorIds.some((id) => c.id.endsWith(id));
        if (matchesById) {
          return true;
        }
      }

      // Then check name filters (partial match)
      if (connectorFilters?.name?.length) {
        const name = c.name?.toLowerCase() ?? '';
        const displayName = c.properties?.displayName?.toLowerCase() ?? '';
        const matchesByName = connectorFilters.name.some((f) => name.includes(f.toLowerCase()) || displayName.includes(f.toLowerCase()));
        if (matchesByName) {
          return true;
        }
      }

      // If we have filters but none matched, return false
      return false;
    },
    [categoryKey, connectorFilters]
  );

  const filterItems = useCallback(
    (c: Connector) =>
      isAgentConnectorAllowed(c) &&
      isACASessionAllowed(c) &&
      passesRuntimeFilter(c) &&
      passesActionTypeFilter(c) &&
      passesA2AWorkflowFilter(c) &&
      passesCategoryFilter(c),
    [
      isAgentConnectorAllowed,
      isACASessionAllowed,
      passesRuntimeFilter,
      passesActionTypeFilter,
      passesA2AWorkflowFilter,
      passesCategoryFilter,
    ]
  );

  // --- Filtered & Sorted Connectors ---
  const sortedConnectors = useMemo(() => {
    if (!allConnectors) {
      return [];
    }
    return defaultSortConnectors(allConnectors.filter(filterItems));
  }, [allConnectors, filterItems]);

  const handleConnectorSelected = useCallback(
    (connectorId: string) => {
      dispatch(selectOperationGroupId(connectorId));
      onConnectorSelected?.(connectorId, 'trigger-browse-v2');
    },
    [dispatch, onConnectorSelected]
  );

  const emptyStateText = intl.formatMessage({
    defaultMessage: 'No connectors found for this category',
    id: '2hl9xo',
    description: 'No connectors message',
  });

  if (isLoading && sortedConnectors.length === 0) {
    return (
      <div className={classes.loadingContainer}>
        <Spinner size="medium" label="Loading connectors..." />
      </div>
    );
  }

  if (!isLoading && sortedConnectors.length === 0) {
    return (
      <div className={classes.emptyStateContainer}>
        <Text>{emptyStateText}</Text>
      </div>
    );
  }

  // --- Row Renderer ---
  const Row = ({ index, style }: RowComponentProps) => (
    <div style={style}>
      <ConnectorCard connector={sortedConnectors[index]} onClick={handleConnectorSelected} displayRuntimeInfo={displayRuntimeInfo} />
    </div>
  );

  return (
    <List
      rowCount={sortedConnectors.length}
      rowHeight={70} // ConnectorCard height
      rowComponent={Row}
      rowProps={{}}
    />
  );
};
