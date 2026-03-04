import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { NodesMetadata } from '../state/workflow/workflowInterfaces';
import type { OutputToken } from '@microsoft/designer-ui';
import type { AgentParameterDeclarations, AgentParameters } from '../state/tokens/tokensSlice';
export declare const initializeAgentParameters: (nodesMetadata: NodesMetadata, allNodesData: NodeDataWithOperationMetadata[]) => Record<string, Record<string, AgentParameterDeclarations>>;
export declare const getAgentParameterTokens: (nodeId: string, agentParameters: Record<string, AgentParameters>, nodesMetadata: NodesMetadata) => OutputToken[] | undefined;
export declare const convertAgentParameterToOutputToken: (agentParameters?: AgentParameterDeclarations) => OutputToken[];
