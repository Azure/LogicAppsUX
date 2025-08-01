import type { AppDispatch } from '../../../../../core/state/mcp/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel, selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SelectOperations } from '../../../operations/SelectOperations';
import { clearAllSelections } from '../../../../../core/state/mcp/mcpselectionslice';

interface OperationsTabProps extends McpConnectorTabProps {
  selectedOperationsCount: number;
  onPrimaryButtonClick: () => void;
  previousTabId: string | undefined;
}

export const operationsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    isTabDisabled,
    isPrimaryButtonDisabled,
    selectedOperationsCount,
    isPrimaryButtonLoading,
    onPrimaryButtonClick,
    previousTabId,
  }: OperationsTabProps
): McpPanelTabProps => {
  const nextButtonText =
    selectedOperationsCount > 0
      ? intl.formatMessage(
          {
            defaultMessage: 'Next ({count} selected)',
            id: 'DYJI/D',
            description: 'Button text for moving to the next tab with operation count',
          },
          { count: selectedOperationsCount }
        )
      : intl.formatMessage({
          defaultMessage: 'Next',
          id: 'ZWnmOv',
          description: 'Button text for moving to the next tab in the connector panel',
        });

  return {
    id: constants.MCP_PANEL_TAB_NAMES.OPERATIONS,
    title: intl.formatMessage({
      defaultMessage: 'Select Operation(s)',
      id: 'ohEtV6',
      description: 'The tab label for the select operations tab on the connector panel',
    }),
    disabled: isTabDisabled,
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
          text: nextButtonText,
          onClick: onPrimaryButtonClick,
          appearance: 'primary',
          disabled: isPrimaryButtonDisabled,
          loading: isPrimaryButtonLoading,
        },
      ],
    },
  };
};
