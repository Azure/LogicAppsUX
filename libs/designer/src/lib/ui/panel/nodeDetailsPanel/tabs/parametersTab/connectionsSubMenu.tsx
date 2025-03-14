import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useConnectorByNodeId, useNodeConnectionId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { AddRegular, Checkmark16Regular, MoreHorizontalRegular } from '@fluentui/react-icons';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';
import { useIntl } from 'react-intl';

export const ConnectionsSubMenu = () => {
  const intl = useIntl();
  const nodeId: string = useOperationPanelSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery?.data ?? [], [connectionQuery]);
  const selectedNodeIds = useConnectionPanelSelectedNodeIds();
  const currentConnectionId = useNodeConnectionId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same

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
            return (
              <MenuItem icon={icon} key={connection.id}>
                {connection.name}
              </MenuItem>
            );
          })}
        </MenuGroup>
        <MenuDivider />
        <MenuGroup>
          <MenuItem icon={<AddRegular />}>{intlText.CREATE}</MenuItem>
        </MenuGroup>
      </MenuList>
    );
  }, [connections]);

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
