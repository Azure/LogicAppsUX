import type { AppDispatch } from '../../../../../core/state/mcp/store';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
interface OperationsTabProps extends McpConnectorTabProps {
    primaryButtonTitle: string;
    onPrimaryButtonClick: () => void;
    tabStatusIcon?: 'error';
}
export declare const operationsTab: (intl: IntlShape, dispatch: AppDispatch, { isTabDisabled, isPrimaryButtonDisabled, primaryButtonTitle, isPrimaryButtonLoading, onPrimaryButtonClick, previousTabId, tabStatusIcon, }: OperationsTabProps) => McpPanelTabProps;
export {};
