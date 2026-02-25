import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1Strong,
  Button,
  Divider,
  Image,
  Link,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Subtitle2,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from '@fluentui/react-components';
import { useMcpServerStyles } from './styles';
import { equals, type McpServer } from '@microsoft/logic-apps-shared';
import { DescriptionWithLink } from '../../configuretemplate/common';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Add20Regular,
  ArrowClockwise20Regular,
  Copy20Regular,
  Delete20Regular,
  Edit20Regular,
  MoreHorizontal20Regular,
  Open20Regular,
  SubtractCircle20Regular,
} from '@fluentui/react-icons';
import WorkflowIcon from '../../../common/images/templates/logicapps.svg';
import { useIntl } from 'react-intl';
import { AddServerModal, DeleteModal } from './modals';

export type ToolHandler = (tool: string) => void;

export interface ServerNotificationData {
  title: string;
  content: string;
}

const showEnableSwitch = false;
export const MCPServers = ({
  servers: _servers,
  isRefreshing,
  onRefresh,
  onUpdateServers,
  onManageTool,
  onManageServer,
  openCreateTools,
}: {
  servers: McpServer[];
  isRefreshing?: boolean;
  onManageTool: ToolHandler;
  onManageServer: ToolHandler;
  onRefresh?: () => void;
  onUpdateServers: (servers: McpServer[], toasterData: ServerNotificationData) => Promise<void>;
  openCreateTools: () => void;
}) => {
  const styles = useMcpServerStyles();
  const intl = useIntl();

  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Servers',
      id: 'rAeHmG',
      description: 'Title for the servers section',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Manage your MCP servers here. You can create, edit, and delete servers as needed.',
      id: 'NuG1jf',
      description: 'Description for the servers section',
    }),
    learnMoreLinkText: intl.formatMessage({
      defaultMessage: 'Learn more',
      id: 'DSgKuF',
      description: 'Link text for learning more about MCP servers',
    }),
    createButtonText: intl.formatMessage({
      defaultMessage: 'Create',
      id: '8iX8Yu',
      description: 'Button text for creating a new server',
    }),
    refreshButtonText: intl.formatMessage({
      defaultMessage: 'Refresh',
      id: 'bcaiap',
      description: 'Button text for refreshing the server list',
    }),
    refreshingButtonText: intl.formatMessage({
      defaultMessage: 'Refreshing...',
      id: 'TYVS2+',
      description: 'Button text for refreshing the server list when in progress',
    }),
    editButtonText: intl.formatMessage({
      defaultMessage: 'Edit',
      id: 'CrlPhs',
      description: 'Button text for editing a server',
    }),
    deleteButtonText: intl.formatMessage({
      defaultMessage: 'Delete',
      id: 'zyaw99',
      description: 'Button text for deleting a server',
    }),
    enabledLabel: intl.formatMessage({
      defaultMessage: 'On',
      id: 'KY5eNe',
      description: 'Label for the enabled switch',
    }),
    disabledLabel: intl.formatMessage({
      defaultMessage: 'Off',
      id: 'UJGUnc',
      description: 'Label for the disabled switch',
    }),
    copyUrlButtonText: intl.formatMessage({
      defaultMessage: 'Copy URL',
      id: '4yDTpq',
      description: 'Label for the copying the endpoint URL button',
    }),
    deleteServerTitle: intl.formatMessage({
      defaultMessage: 'Deleted the MCP server',
      id: 'TZhxdI',
      description: 'Title for the delete server confirmation',
    }),
    removeToolTitle: intl.formatMessage({
      defaultMessage: 'Removed workflow tool.',
      id: 'q3pTzv',
      description: 'Title for the remove tool from server confirmation',
    }),
  };

  const [servers, setServers] = useState<McpServer[]>(_servers);
  const [serverToDelete, setServerToDelete] = useState<string | undefined>(undefined);
  const [showAddServerModal, setShowAddServerModal] = useState<boolean>(false);

  useEffect(() => {
    if (_servers) {
      setServers(_servers);
    }
  }, [_servers]);

  const handleCreateServer = useCallback(() => {
    setShowAddServerModal(true);
  }, []);

  const handleOpenCreateTools = useCallback(() => {
    openCreateTools();
    setShowAddServerModal(false);
  }, [openCreateTools]);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
  }, []);

  const handleUpdateServer = useCallback(
    async (updatedServer: Partial<McpServer>) => {
      const updatedServers = servers.map((server) => (equals(server.name, updatedServer.name) ? { ...server, ...updatedServer } : server));
      setServers(updatedServers);

      await onUpdateServers(updatedServers, {
        title: intl.formatMessage({
          defaultMessage: 'Successfully updated the server.',
          id: 'Xoz0Np',
          description: 'Title for the toaster after updating a server',
        }),
        content: intl.formatMessage(
          {
            defaultMessage: `Successfully updated MCP server: ''{serverName}''.`,
            id: '7BVryg',
            description: 'Confirmation message for updating a server',
          },
          { serverName: updatedServer.name }
        ),
      });
    },
    [servers, intl, onUpdateServers]
  );

  const handleDeleteServer = useCallback(async () => {
    if (serverToDelete) {
      await onUpdateServers(
        servers.filter((server) => !equals(server.name, serverToDelete)),
        {
          title: INTL_TEXT.deleteServerTitle,
          content: intl.formatMessage(
            {
              defaultMessage: `Successfully deleted MCP server: ''{serverName}''.`,
              id: 'kxv92S',
              description: 'Confirmation message for deleting a server',
            },
            { serverName: serverToDelete }
          ),
        }
      );
      setServerToDelete(undefined);
    }
  }, [INTL_TEXT.deleteServerTitle, intl, onUpdateServers, servers, serverToDelete]);

  const handleRemoveTool = useCallback(
    (serverName: string, toolName: string) => {
      const updatedServers = servers.map((server) => {
        if (equals(server.name, serverName)) {
          return {
            ...server,
            tools: server.tools.filter((tool) => !equals(tool.name, toolName)),
          };
        }
        return server;
      });
      onUpdateServers(updatedServers, {
        title: INTL_TEXT.removeToolTitle,
        content: intl.formatMessage(
          {
            defaultMessage: `Successfully removed the ''{toolName}'' workflow tool from the ''{serverName}'' server.`,
            id: 'wcW5LP',
            description: 'Confirmation message for removing a tool from the server',
          },
          { toolName, serverName }
        ),
      });
    },
    [INTL_TEXT.removeToolTitle, intl, onUpdateServers, servers]
  );

  return (
    <div>
      <div className={styles.sectionHeaderContainer}>
        <div className={styles.sectionHeader}>
          <Subtitle2>{INTL_TEXT.title}</Subtitle2>
        </div>
        <DescriptionWithLink
          className={styles.description}
          text={INTL_TEXT.description}
          linkText={INTL_TEXT.learnMoreLinkText}
          linkUrl={'https://go.microsoft.com/fwlink/?linkid=2348013'}
        />
        <div className={styles.buttonContainer}>
          <Button title={INTL_TEXT.createButtonText} appearance="subtle" icon={<Add20Regular />} onClick={handleCreateServer}>
            {INTL_TEXT.createButtonText}
          </Button>
          <Button
            title={INTL_TEXT.refreshButtonText}
            appearance="subtle"
            icon={<ArrowClockwise20Regular />}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? INTL_TEXT.refreshingButtonText : INTL_TEXT.refreshButtonText}
          </Button>
        </div>
      </div>
      <Accordion
        className={styles.sectionContent}
        collapsible={true}
        multiple={true}
        defaultOpenItems={servers.map((server) => server.name)}
      >
        {servers.map((server) => (
          <AccordionItem className={styles.server} value={server.name} key={server.name}>
            <div className={styles.serverHeader}>
              <AccordionHeader className={styles.serverHeaderTextSection}>
                <Body1Strong className={styles.serverHeaderText}>{server.name}</Body1Strong>
              </AccordionHeader>
              <div className={styles.serverHeaderActions}>
                <Button
                  className={styles.serverHeaderButtons}
                  title={INTL_TEXT.editButtonText}
                  appearance="subtle"
                  icon={<Edit20Regular />}
                  onClick={() => onManageServer(server.name)}
                >
                  {INTL_TEXT.editButtonText}
                </Button>
                <Button
                  className={styles.serverHeaderButtons}
                  title={INTL_TEXT.copyUrlButtonText}
                  appearance="subtle"
                  icon={<Copy20Regular />}
                  onClick={() => handleCopyUrl(server.url ?? '')}
                >
                  {INTL_TEXT.copyUrlButtonText}
                </Button>
                <Button
                  className={styles.serverHeaderButtons}
                  title={INTL_TEXT.deleteButtonText}
                  appearance="subtle"
                  icon={<Delete20Regular />}
                  onClick={() => setServerToDelete(server.name)}
                >
                  {INTL_TEXT.deleteButtonText}
                </Button>
                {showEnableSwitch ? (
                  <>
                    <Divider className={styles.serverHeaderDivider} vertical={true} />
                    <Switch
                      checked={server.enabled}
                      label={server.enabled ? INTL_TEXT.enabledLabel : INTL_TEXT.disabledLabel}
                      onChange={(data) => {
                        handleUpdateServer({ name: server.name, enabled: data.currentTarget.checked });
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <Text className={styles.serverDescription}>{server.description}</Text>

            <AccordionPanel className={styles.serverContent}>
              <ServerTools
                tools={server.tools.map((tool) => tool.name)}
                onRemove={(tool) => handleRemoveTool(server.name, tool)}
                onManage={onManageTool}
              />
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>

      {showAddServerModal ? <AddServerModal onCreateTools={handleOpenCreateTools} onDismiss={() => setShowAddServerModal(false)} /> : null}
      {serverToDelete ? <DeleteModal onDelete={handleDeleteServer} onDismiss={() => setServerToDelete(undefined)} /> : null}
    </div>
  );
};

const ServerTools = ({ tools, onRemove, onManage }: { tools: string[]; onRemove: ToolHandler; onManage: ToolHandler }) => {
  const styles = useMcpServerStyles();
  const intl = useIntl();

  const INTL_TEXT = {
    toolsHeader: intl.formatMessage({
      defaultMessage: 'Workflow tools',
      id: 'snkIxZ',
      description: 'Header for the workflow tools section',
    }),
    toolsAriaLabel: intl.formatMessage({
      defaultMessage: 'List of workflow tools',
      id: '15A50P',
      description: 'ARIA label for the workflow tools table',
    }),
    removeToolText: intl.formatMessage({
      defaultMessage: 'Remove',
      id: '6weOOy',
      description: 'Text for removing a workflow tool',
    }),
    manageToolText: intl.formatMessage({
      defaultMessage: 'Manage',
      id: '/sBA0p',
      description: 'Text for managing a workflow tool',
    }),
  };

  const items = useMemo(() => {
    return tools.sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const columns = [
    { columnKey: 'tool', label: INTL_TEXT.toolsHeader },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  if (!items.length) {
    return null;
  }

  return (
    <Table className={styles.tableStyle} aria-label={INTL_TEXT.toolsAriaLabel} size="small">
      <TableHeader>
        <TableRow className={styles.rowStyle}>
          {columns.map((column, i) => (
            <TableHeaderCell key={column.columnKey} className={i === columns.length - 1 ? styles.lastCell : styles.rowStyle}>
              <Body1Strong>{column.label}</Body1Strong>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className={styles.rowStyle}>
        {items.map((item) => (
          <TableRow key={item} className={styles.rowStyle}>
            <TableCell className={styles.nameCell}>
              <Image className={styles.toolIcon} src={WorkflowIcon} />
              <Link as="button" onClick={() => onManage(item)}>
                {item}
              </Link>
            </TableCell>
            <TableCell className={styles.iconsCell}>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="subtle" icon={<MoreHorizontal20Regular />} />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem icon={<SubtractCircle20Regular />} onClick={() => onRemove(item)}>
                      {INTL_TEXT.removeToolText}
                    </MenuItem>
                    <MenuItem icon={<Open20Regular />} onClick={() => onManage(item)}>
                      {INTL_TEXT.manageToolText}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
