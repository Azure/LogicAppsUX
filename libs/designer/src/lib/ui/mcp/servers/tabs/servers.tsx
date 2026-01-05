import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';

const ServersList = () => {
    return <div>Servers List Component</div>;
}




export const serversTab = (
  intl: IntlShape,
  { onTabClick }: McpConnectorTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Servers',
    id: 'acjRTd',
    description: 'The tab label for servers tab',
  }),
  content: <ServersList />,
  onTabClick,
  footerContent: {},
});
