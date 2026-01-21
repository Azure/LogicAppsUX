import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { equals, type McpServer } from '@microsoft/logic-apps-shared';
import { resetQueriesOnUpdateServers, useAllMcpServers } from '../../../core/mcp/utils/queries';
import { getStandardLogicAppId } from '../../../core/configuretemplate/utils/helper';
import { McpServerPanel } from '../panel/server/panel';
import { closePanel, McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { DescriptionWithLink } from '../../configuretemplate/common';
import { Text } from '@fluentui/react-components';
import { AddServerButtons } from '../servers/add';
import { MCPServers, type ServerNotificationData, type ToolHandler } from '../servers/servers';
import { Authentication } from '../servers/authentication';
import { Apps28Regular } from '@fluentui/react-icons';

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
  const dispatch = useDispatch<AppDispatch>();
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

  const { data: mcpServers, isLoading } = useAllMcpServers(logicAppId);

  const [selectedServer, setSelectedServer] = useState<McpServer | undefined>(undefined);

  const handleManageServer = useCallback(
    (serverName: string) => {
      setSelectedServer(mcpServers?.find((server) => server.name === serverName) || undefined);
      dispatch(openMcpPanelView({ panelView: McpPanelView.EditMcpServer }));
    },
    [dispatch, mcpServers]
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
              defaultMessage: 'Server created successfully',
              id: 'wWdzfM',
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
      await onUpdateServers(updatedServers, toasterData);
      resetQueriesOnUpdateServers(logicAppId);
      dispatch(closePanel());
      setSelectedServer(undefined);
    },
    [dispatch, intl, logicAppId, mcpServers, onUpdateServers]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedServer(undefined);
    dispatch(closePanel());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div>
        {intl.formatMessage({
          defaultMessage: 'Loading...',
          id: '9SDUXM',
          description: 'Text displayed while loading MCP Servers',
        })}
      </div>
    );
  }

  return (
    <div>
      <McpServerPanel onUpdateServer={handleUpdateServer} server={selectedServer} onClose={handleClosePanel} />
      {mcpServers?.length === 0 ? (
        <EmptyMcpServersView onCreateTools={onOpenCreateTools} />
      ) : (
        <div>
          <Authentication resourceId={logicAppId} onOpenManageOAuth={onOpenManageOAuth} />
          <MCPServers
            servers={mcpServers ?? []}
            onUpdateServers={onUpdateServers}
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
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Build and manage MCP servers',
      id: 'TH6caA',
      description: 'Title displayed when no MCP servers are found',
    }),
    description: intl.formatMessage({
      defaultMessage: 'There are no servers in your app, please add new servers to get started.',
      id: 'SOEhCs',
      description: 'Description displayed when no MCP servers are found',
    }),
    learnMore: intl.formatMessage({
      defaultMessage: 'Learn more about MCP servers',
      id: 'M/q6Qo',
      description: 'Link text for learning more about MCP servers',
    }),
  };

  return (
    <div style={{ height: '50%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '50px' }}>
        <Apps28Regular style={{ width: 48, height: 48 }} />
        <Text weight="semibold" size={500} style={{ padding: '20px 0 10px 0' }}>
          {INTL_TEXT.title}
        </Text>
        <DescriptionWithLink
          text={INTL_TEXT.description}
          linkText={INTL_TEXT.learnMore}
          linkUrl="https://go.microsoft.com/fwlink/?linkid=2321817"
        />
      </div>
      <div style={{ padding: '10px 0', width: '550px', margin: '0 auto' }}>
        <AddServerButtons onCreateTools={onCreateTools} />
      </div>
    </div>
  );
};
