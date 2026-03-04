interface ConnectionEntryProps {
    connectorId: string;
    refId?: string;
    connectionReference?: any;
    brandColor?: string;
    iconUri?: string;
    disconnectedNodeIds?: string[];
}
export declare const ConnectionEntry: ({ connectorId, refId, connectionReference, iconUri, disconnectedNodeIds }: ConnectionEntryProps) => import("react/jsx-runtime").JSX.Element;
export {};
