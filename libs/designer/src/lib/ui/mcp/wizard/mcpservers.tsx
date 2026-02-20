import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { equals, type McpServer } from '@microsoft/logic-apps-shared';
import { useAllMcpServers } from '../../../core/mcp/utils/queries';
import { getStandardLogicAppId } from '../../../core/configuretemplate/utils/helper';
import { McpServerPanel } from '../panel/server/panel';
import { closePanel, McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { DescriptionWithLink } from '../../configuretemplate/common';
import { Spinner, Text, Image } from '@fluentui/react-components';
import { AddServerButtons } from '../servers/add';
import { MCPServers, type ServerNotificationData, type ToolHandler } from '../servers/servers';
import { Authentication } from '../servers/authentication';
import { useQueryClient } from '@tanstack/react-query';
import { useMcpServerWizardStyles } from './styles';
import McpServerIcon_Light from '../../../common/images/mcp/server_light.svg';
import McpServerIcon_Dark from '../../../common/images/mcp/server_dark.svg';

export const McpServersWizard = ({
  onUpdateServers,
  onOpenWorkflow,
  onOpenCreateTools,
  onOpenManageOAuth,
}: {
  onUpdateServers: (servers: McpServer[], toasterData: ServerNotificationData) => Promise<void>;
  onOpenWorkflow: ToolHandler;
  onOpenCreateTools: () => void;
  onOpenManageOAuth: () => void;
}) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const styles = useMcpServerWizardStyles();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const logicAppId = useMemo(
    () => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName ?? ''),
    [subscriptionId, resourceGroup, logicAppName]
  );
  const intl = useIntl();

  const { data: allServers, isLoading, refetch, isRefetching } = useAllMcpServers(logicAppId);

  const [mcpServers, setMcpServers] = useState<McpServer[] | undefined>(undefined);
  const [selectedServer, setSelectedServer] = useState<McpServer | undefined>(undefined);

  useEffect(() => {
    if (allServers && !isLoading) {
      setMcpServers(allServers);
    }
  }, [allServers, isLoading]);

  const handleManageServer = useCallback(
    (serverName: string) => {
      setSelectedServer(mcpServers?.find((server) => server.name === serverName) || undefined);
      dispatch(openMcpPanelView({ panelView: McpPanelView.EditMcpServer }));
    },
    [dispatch, mcpServers]
  );

  const handleRefreshServers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateServers = useCallback(
    async (servers: McpServer[], toasterData: ServerNotificationData) => {
      await onUpdateServers(servers, toasterData);

      setMcpServers(servers);
      // Update servers cache with new data
      queryClient.setQueryData<McpServer[]>(['mcpservers', logicAppId.toLowerCase()], () => [...servers]);
    },
    [onUpdateServers, queryClient, logicAppId]
  );

  const handleUpdateServer = useCallback(
    async (updatedServer: Partial<McpServer>) => {
      if (!mcpServers) {
        return;
      }
      const isNew = mcpServers.find((server) => equals(server.name, updatedServer.name)) === undefined;

      const updatedServers = isNew
        ? [...mcpServers, updatedServer as McpServer]
        : mcpServers.map((server) => (equals(server.name, updatedServer.name) ? { ...server, ...updatedServer } : server));

      const toasterData: ServerNotificationData = {
        title: isNew
          ? intl.formatMessage({
              defaultMessage: 'Successfully created the server.',
              id: 'cru2+f',
              description: 'Title for the toaster after creating a server',
            })
          : intl.formatMessage({
              defaultMessage: 'Server updated successfully',
              id: 'RSsqSm',
              description: 'Title for the toaster after updating a server',
            }),
        content: isNew
          ? intl.formatMessage(
              {
                defaultMessage: 'The server {serverName} has been created.',
                id: '92h1A6',
                description: 'Content for the toaster after creating a server',
              },
              { serverName: updatedServer.name }
            )
          : intl.formatMessage(
              {
                defaultMessage: 'The server {serverName} has been updated.',
                id: '9sRgCm',
                description: 'Content for the toaster after updating a server',
              },
              { serverName: updatedServer.name }
            ),
      };
      await updateServers(updatedServers, toasterData);

      if (isNew) {
        refetch();
      }

      dispatch(closePanel());
      setSelectedServer(undefined);
    },
    [dispatch, intl, mcpServers, refetch, updateServers]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedServer(undefined);
    dispatch(closePanel());
  }, [dispatch]);

  if (mcpServers === undefined || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="huge" />
        <Text weight="medium" size={500} className={styles.loadingText}>
          {intl.formatMessage({
            defaultMessage: 'Loading...',
            id: '9SDUXM',
            description: 'Text displayed while loading MCP Servers',
          })}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <McpServerPanel onUpdateServer={handleUpdateServer} server={selectedServer} onClose={handleClosePanel} />
      {mcpServers.length === 0 ? (
        <EmptyMcpServersView onCreateTools={onOpenCreateTools} />
      ) : (
        <div>
          <Authentication resourceId={logicAppId} onOpenManageOAuth={onOpenManageOAuth} />
          <MCPServers
            servers={mcpServers ?? []}
            isRefreshing={isRefetching}
            onRefresh={handleRefreshServers}
            onUpdateServers={updateServers}
            onManageTool={onOpenWorkflow}
            onManageServer={handleManageServer}
            openCreateTools={onOpenCreateTools}
          />
        </div>
      )}
      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};

const EmptyMcpServersView = ({ onCreateTools }: { onCreateTools: () => void }) => {
  const styles = useMcpServerWizardStyles();
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Create an MCP server',
      id: 'iLIiyR',
      description: 'Title displayed when no MCP servers are found',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Start by choosing or creating workflows as tools for agents to perform tasks.',
      id: 'oo72Za',
      description: 'Description displayed when no MCP servers are found',
    }),
    learnMore: intl.formatMessage({
      defaultMessage: 'Learn more about MCP servers',
      id: 'M/q6Qo',
      description: 'Link text for learning more about MCP servers',
    }),
  };

  const isDarkMode = useSelector((state: RootState) => state.mcpOptions.isDarkMode);

  return (
    <div className={styles.emptyViewContainer}>
      <div className={styles.emptyViewContent}>
        <Image src={isDarkMode ? McpServerIcon_Dark : McpServerIcon_Light} className={styles.icon} />
        <Text weight="semibold" size={500} className={styles.emptyViewTitle}>
          {INTL_TEXT.title}
        </Text>
        <DescriptionWithLink
          text={INTL_TEXT.description}
          linkText={INTL_TEXT.learnMore}
          linkUrl="https://go.microsoft.com/fwlink/?linkid=2321817"
        />
      </div>
      <div className={styles.emptyViewButtons}>
        <AddServerButtons onCreateTools={onCreateTools} />
      </div>
    </div>
  );
};
