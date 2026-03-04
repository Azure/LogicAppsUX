interface ConnectionDisplayProps {
    connectionName: string | undefined;
    nodeId: string;
    readOnly: boolean;
    readOnlyReason?: string;
    isLoading?: boolean;
    hasError: boolean;
}
export declare const ConnectionDisplay: (props: ConnectionDisplayProps) => import("react/jsx-runtime").JSX.Element;
export {};
