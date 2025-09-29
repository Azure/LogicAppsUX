import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { McpCreateAppTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel, selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SimpleCreateReview } from '../../../logicapps/simplecreatereview';

export const quickReviewTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  createButtonText: string,
  templateDetails: {
    isValidating: boolean;
    isCreated: boolean;
    resourcesStatus: Record<string, string>;
    errorInfo?: { title: string; message: string };
  },
  {
    isTabDisabled,
    onTabClick,
    previousTabId,
    isPrimaryButtonDisabled,
    isSecondaryButtonDisabled,
    onPrimaryButtonClick,
  }: McpCreateAppTabProps
): McpPanelTabProps => ({
  id: constants.MCP_PANEL_TAB_NAMES.QUICK_REVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Review + create',
    id: 'JU3q4H',
    description: 'The tab label for review tab for quick app create panel',
  }),
  content: <SimpleCreateReview {...templateDetails} />,
  disabled: isTabDisabled,
  onTabClick: onTabClick,
  footerContent: {
    buttonContents: templateDetails.isCreated
      ? [
          {
            type: 'navigation',
            text: intl.formatMessage({
              defaultMessage: 'Close',
              id: 'FTrMxN',
              description: 'Button text for closing the panel',
            }),
            onClick: () => {
              dispatch(closePanel());
            },
          },
        ]
      : [
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
            disabled: isSecondaryButtonDisabled,
          },
          {
            type: 'navigation',
            text: createButtonText,
            onClick: () => {
              onPrimaryButtonClick?.();
            },
            appearance: 'primary',
            disabled: isPrimaryButtonDisabled,
          },
        ],
  },
});
