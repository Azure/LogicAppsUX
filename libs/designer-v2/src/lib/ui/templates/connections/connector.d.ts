import type { IImageStyles, IImageStyleProps, IStyleFunctionOrObject } from '@fluentui/react';
import { type Template } from '@microsoft/logic-apps-shared';
import type { ConnectorInfo } from '../../../core/templates/utils/queries';
export declare const ConnectorIcon: ({ connectorId, operationId, classes, }: {
    connectorId: string;
    classes: Record<string, string>;
    operationId?: string | undefined;
    styles?: IStyleFunctionOrObject<IImageStyleProps, IImageStyles> | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare const ConnectorIconWithName: ({ connectorId, operationId, classes, showProgress, onConnectorLoaded, onNameClick, }: {
    connectorId: string;
    classes: Record<string, string>;
    operationId?: string | undefined;
    showProgress?: boolean | undefined;
    onConnectorLoaded?: ((connector: ConnectorInfo) => void) | undefined;
    onNameClick?: (() => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare const ConnectorWithDetails: ({ id, kind }: Template.FeaturedConnector) => import("react/jsx-runtime").JSX.Element;
export declare const ConnectorConnectionName: ({ connectorId, connectionKey }: {
    connectorId: string;
    connectionKey: string | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare const CompactConnectorConnectionStatus: ({ connectorId, hasConnection }: {
    connectorId: string;
    hasConnection: boolean;
}) => import("react/jsx-runtime").JSX.Element;
