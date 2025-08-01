import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel, selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SelectConnectors } from '../../../connectors/SelectConnectors';
import { clearAllSelections } from '../../../../../core/state/mcp/mcpselectionslice';

export const connectorsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled }: McpConnectorTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.CONNECTORS,
  title: intl.formatMessage({
    defaultMessage: 'Choose connector',
    id: 'SSwIzz',
    description: 'The tab label for connector tab on the connector panel',
  }),
  content: <SelectConnectors />,
  disabled: isTabDisabled,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          dispatch(clearAllSelections());
          dispatch(closePanel());
        },
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
