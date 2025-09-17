import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpCreateAppTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SimpleCreateReview } from '../../../logicapps/simplecreatereview';
import type { ArmTemplate } from '../../../../../core/mcp/utils/logicapp';

export const quickReviewTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  templateDetails: { isValidating: boolean; template?: ArmTemplate; errorMessage?: string },
  { isTabDisabled, previousTabId, isPrimaryButtonDisabled, onPrimaryButtonClick }: McpCreateAppTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.QUICK_REVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Review + create',
    id: 'JU3q4H',
    description: 'The tab label for review tab for quick app create panel',
  }),
  content: <SimpleCreateReview {...templateDetails} />,
  disabled: isTabDisabled,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Previous',
          id: '95Psou',
          description: 'Button text for moving to the previous tab in the create app panel',
        }),
        onClick: () => {
          dispatch(selectPanelTab(previousTabId));
        },
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Review + create',
          id: 'COKUSs',
          description: 'Button text for creating the logic app',
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
