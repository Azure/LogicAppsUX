import { type ConnectionReference } from '@microsoft/logic-apps-shared';
export declare const useAreMappingsInitialized: (operations: string[]) => boolean;
export declare const useAllReferenceKeys: () => string[];
export declare const useConnectionReference: () => ConnectionReference | undefined;
export declare const useOperationNodeIds: (connectorId: string) => string[];
