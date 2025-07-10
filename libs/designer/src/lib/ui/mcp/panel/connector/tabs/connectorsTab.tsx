import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SelectConnectors } from '../../../connectors/SelectConnectors';

export const connectorsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled, isPreviousButtonDisabled }: McpConnectorTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.CONNECTORS,
  title: intl.formatMessage({
    defaultMessage: 'Add Connector',
    id: 'BimumA',
    description: 'The tab label for the add connector tab on the connector panel',
  }),
  content: <SelectConnectors />,
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
        onClick: () => {},
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
          dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.OPERATIONS));
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});
