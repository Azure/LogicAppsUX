import { type ParameterInfo, type ConnectionReferences, type ConnectionsData } from '@microsoft/logic-apps-shared';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
export declare const convertConnectionsDataToReferences: (connectionsData: ConnectionsData | undefined) => ConnectionReferences;
export declare const initializeOperationDetails: (nodeId: string, operationInfo: NodeOperation, area: string) => Promise<NodeOperationInputsData | undefined>;
export declare const operationHasEmptyStaticDependencies: (nodeInputs: NodeInputs, dependencies: Record<string, DependencyInfo>) => boolean;
export declare const isDependentStaticParameter: (parameter: ParameterInfo, dependencies: Record<string, DependencyInfo>) => boolean;
export declare const getUnsupportedOperations: (nodeOperations: NodeOperationInputsData[]) => string[];
