import type { LogicAppsV2, ParameterInfo, Template } from '@microsoft/logic-apps-shared';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import type { ConnectionReferences } from '../../../common/models/workflow';
export interface TemplateOperationParametersMetadata {
    parameterDefinitions: Record<string, Template.ParameterDefinition>;
    inputsPayload: NodeOperationInputsData[];
}
export declare const initializeParametersMetadata: (templateId: string, workflows: Record<string, WorkflowTemplateData>, parameterDefinitions: Record<string, Template.ParameterDefinition>, connections: Record<string, Template.Connection>, resourceDetails: {
    subscriptionId: string;
    location: string;
}) => Promise<TemplateOperationParametersMetadata>;
type TemplateParameter = Template.ParameterDefinition & {
    id: string;
};
export interface OperationDetails {
    id: string;
    nodeInputs: NodeInputs;
    nodeOperationInfo: NodeOperation;
    inputDependencies: Record<string, DependencyInfo>;
    templateParameters: TemplateParameter[];
}
export declare const initializeOperationDetails: (nodeId: string, operation: LogicAppsV2.OperationDefinition, connectorId: string | undefined, isTrigger: boolean, templateParameters: TemplateParameter[], references: ConnectionReferences) => Promise<OperationDetails | undefined>;
export declare const updateOperationParameterWithTemplateParameterValue: (parameterId: string, value: any, nodeInputs: NodeInputs) => void;
export declare const shouldAddDynamicData: ({ value }: ParameterInfo) => boolean;
export {};
