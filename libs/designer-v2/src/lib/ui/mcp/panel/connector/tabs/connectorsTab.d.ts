import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { McpConnectorTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
export declare const connectorsTab: (intl: IntlShape, dispatch: AppDispatch, { isTabDisabled, isPrimaryButtonDisabled }: McpConnectorTabProps) => McpPanelTabProps;
