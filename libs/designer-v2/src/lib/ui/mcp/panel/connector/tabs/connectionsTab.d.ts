import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
export declare const connectionsTab: (intl: IntlShape, dispatch: AppDispatch, connectorId: string, operations: string[], { onTabClick, isTabDisabled, isPrimaryButtonDisabled, onPrimaryButtonClick, previousTabId }: McpConnectorTabProps) => McpPanelTabProps;
