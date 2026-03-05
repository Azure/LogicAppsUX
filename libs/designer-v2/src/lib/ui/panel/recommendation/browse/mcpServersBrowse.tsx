import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useMcpServersQuery } from '../../../../core/queries/browse';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { Text, Spinner, Tab, TabList, Dropdown, Option, Field, type SelectTabData, type SelectTabEvent } from '@fluentui/react-components';
import { Grid } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../../core';
import { useMcpServersBrowseStyles } from './styles/McpServersBrowse.styles';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { openMcpToolWizard } from '../../../../core/state/panel/panelSlice';
import { builtinMcpServerOperation, connectionToOperation, getOperationCardDataFromOperation, MCP_CLIENT_CONNECTOR_ID } from '../helpers';

type McpServerTab = 'all' | 'microsoft' | 'custom' | 'others';

export interface McpServersBrowseProps {
  onOperationClick?: (operationId: string, apiId?: string) => void;
}

export const McpServersBrowse = ({ onOperationClick: _onOperationClick }: McpServersBrowseProps) => {
  const intl = useIntl();
  const classes = useMcpServersBrowseStyles();
  const dispatch = useDispatch<AppDispatch>();

  const [selectedTab, setSelectedTab] = useState<McpServerTab>('all');
  const [sortOrder, setSortOrder] = useState<'a-to-z' | 'z-to-a'>('a-to-z');

  const { data: mcpServersData, isLoading: isServersLoading } = useMcpServersQuery();

  const mcpServers = useMemo(() => {
    return mcpServersData?.data ?? [];
  }, [mcpServersData?.data]);

  const { data: mcpConnections, isLoading: isConnectionsLoading } = useConnectionsForConnector(MCP_CLIENT_CONNECTOR_ID, true);

  const isLoading = isServersLoading || (selectedTab === 'others' && isConnectionsLoading);

  const handleMcpServerClick = useCallback(
    (server: DiscoveryOperation<DiscoveryResultTypes>) => {
      const isExistingConnection = server.type === 'builtinMcpClientToolConnection';
      const connectionId = isExistingConnection ? server.id : undefined;
      const forceCreateConnection = server.properties?.api?.id === MCP_CLIENT_CONNECTOR_ID && !isExistingConnection;
      dispatch(openMcpToolWizard({ operation: server, connectionId, forceCreateConnection }));
    },
    [dispatch]
  );

  const handleTabSelect = useCallback((_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as McpServerTab);
  }, []);

  const noServersText = intl.formatMessage({
    defaultMessage: 'No MCP servers available',
    id: 'FEucgA',
    description: 'Text shown when no MCP servers are available',
  });

  const allTabDescriptionText = intl.formatMessage({
    defaultMessage: 'Choose a Model Context Protocol (MCP) server to invoke.',
    id: 'EvgBRe',
    description: 'Description text for MCP server selection',
  });

  const microsoftTabDescriptionText = intl.formatMessage({
    defaultMessage: 'MCP servers provided and managed by Microsoft.',
    id: 'WIIV8A',
    description: 'Description text for Microsoft MCP servers tab',
  });

  const customTabDescriptionText = intl.formatMessage({
    defaultMessage:
      'MCP servers created or managed by your organization for reuse across logic apps, with enterprise-level authentication.',
    id: 'dfYgIR',
    description: 'Description text for Custom MCP servers tab',
  });

  const othersTabDescriptionText = intl.formatMessage({
    defaultMessage: 'MCP servers added directly to a single logic app for quick setup, experiments, or proofs of concept.',
    id: 'V1U5Gz',
    description: 'Description text for Others MCP servers tab',
  });

  const allTabText = intl.formatMessage({
    defaultMessage: 'All',
    id: 'hGbRBS',
    description: 'All tab label',
  });

  const microsoftTabText = intl.formatMessage({
    defaultMessage: 'Microsoft',
    id: 'lL5oRE',
    description: 'Microsoft tab label',
  });

  const customTabText = intl.formatMessage({
    defaultMessage: 'Custom',
    id: 'wnBqJB',
    description: 'Custom tab label',
  });

  const othersTabText = intl.formatMessage({
    defaultMessage: 'Others',
    id: 'h0WB5b',
    description: 'Others tab label for custom MCP server connections',
  });

  const sortLabel = intl.formatMessage({
    defaultMessage: 'Sort',
    id: 'D3DXLP',
    description: 'Sort label',
  });

  const sortAtoZ = intl.formatMessage({
    defaultMessage: 'A to Z, ascending',
    id: 'JiCr7D',
    description: 'Sort option A to Z',
  });

  const sortZtoA = intl.formatMessage({
    defaultMessage: 'Z to A, descending',
    id: 'mngJaA',
    description: 'Sort option Z to A',
  });

  const isMicrosoftServer = useCallback((server: DiscoveryOperation<DiscoveryResultTypes>) => {
    return server.type?.toLowerCase() === 'microsoft.web/locations/managedapis/apioperations';
  }, []);

  const filteredAndSortedServers = useMemo(() => {
    const connectionOperations = (mcpConnections ?? []).map(connectionToOperation);

    let filtered: DiscoveryOperation<DiscoveryResultTypes>[] = [];

    if (selectedTab === 'microsoft') {
      filtered = mcpServers.filter(isMicrosoftServer);
    } else if (selectedTab === 'custom') {
      filtered = mcpServers.filter((server) => !isMicrosoftServer(server));
    } else if (selectedTab === 'others') {
      filtered = connectionOperations;
    } else if (selectedTab === 'all') {
      filtered = [...mcpServers, ...connectionOperations];
    }

    filtered.sort((a, b) => {
      const aName = a.properties?.summary ?? a.name ?? '';
      const bName = b.properties?.summary ?? b.name ?? '';
      return sortOrder === 'a-to-z' ? aName.localeCompare(bName) : bName.localeCompare(aName);
    });

    if (selectedTab === 'all') {
      return [builtinMcpServerOperation, ...filtered];
    }
    if (selectedTab === 'others') {
      return [builtinMcpServerOperation, ...filtered];
    }
    return filtered;
  }, [mcpServers, mcpConnections, selectedTab, sortOrder, isMicrosoftServer]);

  const displayingItemsText = intl.formatMessage(
    {
      defaultMessage: 'Displaying {count} {count, plural, one {item} other {items}}',
      id: '8PDiiR',
      description: 'Text showing number of MCP servers',
    },
    { count: filteredAndSortedServers.length }
  );

  const descriptionText =
    selectedTab === 'microsoft'
      ? microsoftTabDescriptionText
      : selectedTab === 'custom'
        ? customTabDescriptionText
        : selectedTab === 'others'
          ? othersTabDescriptionText
          : allTabDescriptionText;

  if (isLoading) {
    return (
      <div className={classes.loadingContainer}>
        <Spinner size="medium" />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.filterRow}>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} size="small">
          <Tab value="all">{allTabText}</Tab>
          <Tab value="microsoft">{microsoftTabText}</Tab>
          <Tab value="custom">{customTabText}</Tab>
          <Tab value="others">{othersTabText}</Tab>
        </TabList>
      </div>

      <div className={classes.headerSection}>
        <Text className={classes.description}>{descriptionText}</Text>
      </div>

      <div className={classes.itemCountRow}>
        <Text className={classes.itemCount}>{displayingItemsText}</Text>
        <Field className={classes.sortField} label={sortLabel} orientation="horizontal">
          <Dropdown
            className={classes.sortDropdown}
            size="small"
            value={sortOrder === 'a-to-z' ? sortAtoZ : sortZtoA}
            selectedOptions={[sortOrder]}
            onOptionSelect={(_e, data) => setSortOrder(data.optionValue as 'a-to-z' | 'z-to-a')}
          >
            <Option value="a-to-z">{sortAtoZ}</Option>
            <Option value="z-to-a">{sortZtoA}</Option>
          </Dropdown>
        </Field>
      </div>

      {filteredAndSortedServers.length === 0 ? (
        <div className={classes.emptyStateContainer}>
          <Text>{noServersText}</Text>
        </div>
      ) : (
        <Grid
          items={filteredAndSortedServers.map(getOperationCardDataFromOperation)}
          onOperationSelected={(operationId) => {
            const server = filteredAndSortedServers.find((s) => s.id === operationId);
            if (server) {
              handleMcpServerClick(server);
            }
          }}
          isLoading={false}
          showEmptyState={false}
          displayRuntimeInfo={false}
          hideFavorites
        />
      )}
    </div>
  );
};
