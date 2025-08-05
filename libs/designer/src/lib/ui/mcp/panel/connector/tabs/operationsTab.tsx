import type { AppDispatch } from '../../../../../core/state/mcp/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel, selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SelectOperations } from '../../../operations/SelectOperations';
import { clearAllSelections } from '../../../../../core/state/mcp/mcpselectionslice';

interface OperationsTabProps extends McpConnectorTabProps {
  primaryButtonTitle: string;
  onPrimaryButtonClick: () => void;
  previousTabId: string | undefined;
  tabStatusIcon?: 'error';
}

export const operationsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    isTabDisabled,
    isPrimaryButtonDisabled,
    primaryButtonTitle,
    isPrimaryButtonLoading,
    onPrimaryButtonClick,
    previousTabId,
    tabStatusIcon,
  }: OperationsTabProps
): McpPanelTabProps => {
  return {
    id: constants.MCP_PANEL_TAB_NAMES.OPERATIONS,
    title: intl.formatMessage({
      defaultMessage: 'Add actions',
      id: 'i7OrmB',
      description: 'The tab label for the add actions tab on the connector panel',
    }),
    disabled: isTabDisabled,
    tabStatusIcon,
    content: <SelectOperations />,
    footerContent: {
      buttonContents: [
        {
          type: 'navigation',
          text: previousTabId
            ? intl.formatMessage({
                defaultMessage: 'Previous',
                id: 'sqA07R',
                description: 'Button text for moving to the previous tab in the connector panel',
              })
            : intl.formatMessage({
                defaultMessage: 'Close',
                id: 'FTrMxN',
                description: 'Button text for closing the panel',
              }),
          onClick: () => {
            if (previousTabId) {
              dispatch(selectPanelTab(previousTabId));
            } else {
              dispatch(clearAllSelections());
              dispatch(closePanel());
            }
          },
        },
        {
          type: 'navigation',
          text: primaryButtonTitle,
          onClick: onPrimaryButtonClick,
          appearance: 'primary',
          disabled: isPrimaryButtonDisabled,
          loading: isPrimaryButtonLoading,
        },
      ],
    },
  };
};
