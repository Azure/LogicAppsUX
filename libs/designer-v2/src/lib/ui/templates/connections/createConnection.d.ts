import type { Connection } from '@microsoft/logic-apps-shared';
import type { CreateButtonTexts } from '../../panel';
export declare const CreateConnectionInTemplate: (props: {
    connectorId: string;
    connectionKey: string;
    showDescription?: boolean | undefined;
    createButtonTexts?: CreateButtonTexts | undefined;
    onConnectionCreated: (connection: Connection) => void;
    onConnectionCancelled: () => void;
}) => import("react/jsx-runtime").JSX.Element;
