import type { AppDispatch } from '../../../../../core/state/mcp/store';
import constants from '../../../../../common/constants';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { SelectOperations } from '../../../operations/SelectOperations';

interface OperationsTabProps extends McpConnectorTabProps {
  selectedOperationsCount: number;
  onSelectOperations: () => void;
}

export const operationsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled, isPreviousButtonDisabled, selectedOperationsCount, onSelectOperations }: OperationsTabProps
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
    content: <SelectOperations />,
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
            dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.CONNECTORS));
          },
          disabled: isPreviousButtonDisabled,
        },
        {
          type: 'navigation',
          text: nextButtonText,
          onClick: onSelectOperations,
          appearance: 'primary',
          disabled: isPrimaryButtonDisabled || selectedOperationsCount === 0,
        },
      ],
    },
  };
};
