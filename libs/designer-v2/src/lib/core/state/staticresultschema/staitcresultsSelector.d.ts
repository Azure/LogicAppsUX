import type { StaticResultsState } from './staticresultsSlice';
export declare const useHasSchema: (connectorId: string, operationId: string) => boolean;
export declare const useStaticResultSchema: (connectorId: string, operationId: string) => import("@microsoft/logic-apps-shared/src/utils/src/lib/models/openApiV2").Schema;
export declare const useStaticResultProperties: (propertyName: string) => any;
export declare const getStaticResultForNodeId: (staticResultState: StaticResultsState, nodeId: string) => any;
