import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpCreateAppTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SimpleCreate } from '../../../logicapps/simplecreate';
import { clearNewLogicAppDetails } from '../../../../../core/state/mcp/resourceSlice';

export const quickBasicsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  showValidationErrors: boolean,
  { isTabDisabled, isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: McpCreateAppTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.QUICK_BASICS,
  title: intl.formatMessage({
    defaultMessage: 'Basics',
    id: 'g3DKT8',
    description: 'The tab label for basics tab for quick app create panel',
  }),
  tabStatusIcon,
  content: <SimpleCreate showValidationErrors={showValidationErrors} />,
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
          dispatch(clearNewLogicAppDetails());
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
          onPrimaryButtonClick?.();
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});
