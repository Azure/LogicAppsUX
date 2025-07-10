import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';

export const ConnectionsComponent = () => {
  return <div>connections component</div>;
};

export const connectionsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled, isPreviousButtonDisabled, onAddConnector: onSubmit }: McpConnectorTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Create connection',
    id: 'Cosbik',
    description: 'The tab label for the create connection tab on the connector panel',
  }),
  content: <ConnectionsComponent />,
  disabled: isTabDisabled,
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
        disabled: isPreviousButtonDisabled,
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: 'ZWnmOv',
          description: 'Button text for moving to the next tab in the connector panel',
        }),
        onClick: () => {
          onSubmit?.();
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});
