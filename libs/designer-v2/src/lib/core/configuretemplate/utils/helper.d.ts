import type { ConnectionsData, LogicAppsV2, Template, WorkflowData } from '@microsoft/logic-apps-shared';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { OperationDetails } from '../../templates/utils/parametershelper';
import type { NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import type { ValueSegment } from '@microsoft/designer-ui';
export declare const delimiter = "::::::";
export declare const getTemplateConnectionsFromConnectionsData: (connectionsData: ConnectionsData | undefined) => Record<string, Template.Connection>;
export declare const getLogicAppId: (subscriptionId: string, resourceGroup: string, logicAppName: string) => string;
export declare const getStandardLogicAppId: (subscriptionId: string, resourceGroup: string, logicAppName: string) => string;
export declare const getConnectionMappingInDefinition: (definition: LogicAppsV2.WorkflowDefinition, workflowId: string) => Promise<Record<string, string>>;
export declare const getOperationDataInDefinitions: (workflows: Record<string, WorkflowTemplateData>, connections: Record<string, Template.Connection>) => Promise<NodeOperationInputsData[]>;
export declare const getAllNodeData: (operationDetailsPromises: Promise<OperationDetails | undefined>[]) => Promise<NodeOperationInputsData[]>;
export declare const getParametersForWorkflow: (allParameters: Template.ParameterDefinition[], workflowId: string) => Template.ParameterDefinition[];
export declare const getParameterReferencesFromValue: (segments: ValueSegment[]) => string[];
export declare const getConnectorKind: (connectorId: string) => Template.FeaturedConnectorType;
export declare const getSupportedSkus: (connections: Record<string, Template.Connection>) => Template.SkuType[];
export declare const getDefinitionFromWorkflowManifest: (manifest: Template.WorkflowManifest) => LogicAppsV2.WorkflowDefinition;
export declare const getSaveMenuButtons: (resourceStrings: Record<string, string>, currentStatus: Template.TemplateEnvironment, onSave: (status: Template.TemplateEnvironment) => void) => {
    text: string;
    onClick: () => void;
}[];
export declare const getManifestAndDefinitionFromWorkflowData: (workflow: Partial<WorkflowTemplateData>, connections: Record<string, Template.Connection>, parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>) => WorkflowData;
export declare const getZippedTemplateForDownload: (templateManifest: Template.TemplateManifest, workflowDatas: Record<string, {
    manifest: Template.WorkflowManifest;
    workflowDefinition: any;
}>, connections: Record<string, Template.Connection>, parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>) => Promise<void>;
export declare const getDateTimeString: (timeString: string, defaultValue?: string) => string;
export declare const workflowIdentifier = "#workflowname#";
interface ConnectionsAndWorkflowsData {
    connections: Record<string, Template.Connection>;
    mapping: Record<string, string>;
    workflowsData: Record<string, Partial<WorkflowTemplateData>>;
}
interface ParametersAndWorkflowsData {
    parameters: Record<string, Template.ParameterDefinition>;
    workflowsData: Record<string, Partial<WorkflowTemplateData>>;
}
export declare const suffixConnectionsWithIdentifier: (connections: Record<string, Template.Connection>, workflowsData: Record<string, Partial<WorkflowTemplateData>>, mapping: Record<string, string>) => ConnectionsAndWorkflowsData;
export declare const suffixParametersWithIdentifier: (parameters: Record<string, Partial<Template.ParameterDefinition>>, workflowsData: Record<string, Partial<WorkflowTemplateData>>) => ParametersAndWorkflowsData;
export declare const sanitizeConnectorIds: (connections: Record<string, Template.Connection>) => Record<string, Template.Connection>;
export declare const sanitizeConnectorId: (id: string) => string;
export declare const formatNameWithIdentifierToDisplay: (name: string) => string;
export {};
