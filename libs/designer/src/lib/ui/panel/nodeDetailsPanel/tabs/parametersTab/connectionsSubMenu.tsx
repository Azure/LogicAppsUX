import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useConnectorByNodeId, useNodeConnectionId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { AddRegular, Checkmark16Regular, MoreHorizontalRegular } from '@fluentui/react-icons';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';
import { useIntl } from 'react-intl';
import { ConnectionService, type Connector, LogEntryLevel, LoggerService, type Connection } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { reloadParametersTab, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import type { AppDispatch } from '../../../../../core';

interface ConnectionsSubMenuProps {
  setShowSubComponent?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ConnectionsSubMenu: React.FC<ConnectionsSubMenuProps> = ({ setShowSubComponent }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const nodeId: string = useOperationPanelSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery?.data ?? [], [connectionQuery]);
  const selectedNodeIds = useConnectionPanelSelectedNodeIds();
  const currentConnectionId = useNodeConnectionId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) {
        return;
      }
      for (const nodeId of selectedNodeIds) {
        dispatch(
          updateNodeConnection({
            nodeId,
            connection,
            connector: connector as Connector,
          })
        );
        ConnectionService().setupConnectionIfNeeded(connection);
      }
    },
    [dispatch, selectedNodeIds, connector]
  );

  const onConnectionSelect = useCallback(
    (connection: Connection) => {
      LoggerService().log({
        area: 'ConnectionTable.onConnectionSelect',
        args: [`new:${connection.id}`, `current:${currentConnectionId}`],
        level: LogEntryLevel.Verbose,
        message: 'Connection was selected.',
      });

      if (connection.id !== currentConnectionId) {
        saveSelectionCallback(connection);
        dispatch(reloadParametersTab());
      }
    },
    [currentConnectionId, dispatch, saveSelectionCallback]
  );

  const intlText = useMemo(
    () => ({
      CREATE: intl.formatMessage({
        defaultMessage: 'Create',
        id: 'MX/t8B',
        description: 'Text to show that the user can create a new connection',
      }),
    }),
    [intl]
  );

  const connectionsList = useMemo(() => {
    return (
      <MenuList>
        <MenuGroup>
          {connections.map((connection) => {
            const icon = connection.id === currentConnectionId ? <Checkmark16Regular /> : undefined;
            const connectionName = connection.properties.displayName || connection.name;
            return (
              <MenuItem icon={icon} key={connection.id} onClick={() => onConnectionSelect(connection)}>
                {connectionName}
              </MenuItem>
            );
          })}
        </MenuGroup>
        <MenuDivider />
        <MenuGroup>
          <MenuItem
            onClick={() => {
              setShowSubComponent && setShowSubComponent(true);
            }}
            icon={<AddRegular />}
          >
            {intlText.CREATE}
          </MenuItem>
        </MenuGroup>
      </MenuList>
    );
  }, [connections, currentConnectionId, intlText.CREATE, onConnectionSelect, setShowSubComponent]);

  if (connections.length === 0) {
    return null;
  }

  return (
    <Menu positioning={{ autoSize: true }}>
      <MenuTrigger disableButtonEnhancement>
        <MenuButton appearance="transparent" icon={<MoreHorizontalRegular />} />
      </MenuTrigger>
      <MenuPopover>{connectionsList}</MenuPopover>
    </Menu>
  );
};
