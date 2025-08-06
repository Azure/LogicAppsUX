import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { ConnectionSelection } from '../../../connections/connectionselection';

export const connectionsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  connectorId: string,
  operations: string[],
  { onTabClick, isTabDisabled, isPrimaryButtonDisabled, onPrimaryButtonClick }: McpConnectorTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Create connection',
    id: 'Cosbik',
    description: 'The tab label for the create connection tab on the connector panel',
  }),
  content: <ConnectionSelection connectorId={connectorId} operations={operations} />,
  disabled: isTabDisabled,
  onTabClick,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'sqA07R',
          description: 'Button text for moving to the previous tab in the connector panel',
        }),
        onClick: () => {
          dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.OPERATIONS));
        },
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Save',
          id: 'CPH+z+',
          description: 'Button text to the save in the connector panel',
        }),
        onClick: () => {
          onPrimaryButtonClick?.();
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});
