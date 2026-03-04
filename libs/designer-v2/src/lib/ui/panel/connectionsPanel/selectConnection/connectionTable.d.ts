/// <reference types="react" />
import type { Connection } from '@microsoft/logic-apps-shared';
export interface ConnectionTableProps {
    connections: Connection[];
    currentConnectionId?: string;
    saveSelectionCallback: (connection?: Connection) => void;
    cancelSelectionCallback?: () => void;
    isXrmConnectionReferenceMode: boolean;
}
export declare const ConnectionTable: (props: ConnectionTableProps) => JSX.Element;
