import { getRecordEntry, SUBGRAPH_TYPES, TokenType } from '@microsoft/logic-apps-shared';
import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { NodesMetadata } from '../state/workflow/workflowInterfaces';
import { AgentParameterBrandColor, AgentParameterIcon, ParameterGroupKeys } from './parameters/helper';
import Constants from '../../common/constants';
import type { OutputToken } from '@microsoft/designer-ui';
import type { AgentParameterDeclarations, AgentParameters } from '../state/tokens/tokensSlice';

export const initializeAgentParameters = (
  nodesMetadata: NodesMetadata,
  allNodesData: NodeDataWithOperationMetadata[]
): Record<string, Record<string, AgentParameterDeclarations>> => {
  const agentParameters: Record<string, Record<string, AgentParameterDeclarations>> = {};

  const agentConditions = Object.keys(nodesMetadata).filter(
    (nodeId) => getRecordEntry(nodesMetadata, nodeId)?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION
  );

  agentConditions.forEach((agentCondition) => {
    const nodeData = allNodesData.find((node) => node.id === agentCondition);
    const nodeInputs = nodeData?.nodeInputs?.parameterGroups?.[ParameterGroupKeys.DEFAULT]?.rawInputs;

    if (!nodeInputs) {
      return;
    }

    const agentSchema = nodeInputs.find((input) => input.name === Constants.PARAMETER_NAMES.AGENT_PARAMETER_SCHEMA)?.value;

    if (!agentSchema?.properties) {
      return;
    }

    const agentNodeId = getRecordEntry(nodesMetadata, agentCondition)?.parentNodeId;
    if (!agentNodeId) {
      return;
    }

    agentParameters[agentNodeId] = agentParameters[agentNodeId] ?? {};
    agentParameters[agentNodeId][agentCondition] = agentSchema.properties;
  });

  return agentParameters;
};

export const getAgentParameterTokens = (
  nodeId: string,
  agentParameters: Record<string, AgentParameters>,
  nodesMetadata: NodesMetadata
): OutputToken[] | undefined => {
  let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

  while (nodeGraphId) {
    const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
    if (!nodeMetadata) {
      return undefined;
    }

    const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
    if (isAgentCondition) {
      break;
    }

    nodeGraphId = nodeMetadata.graphId;
  }

  if (!nodeGraphId) {
    return undefined;
  }

  const upstreamAgentNodeId = getRecordEntry(nodesMetadata, nodeGraphId)?.parentNodeId;
  if (!upstreamAgentNodeId) {
    return undefined;
  }

  const agentParameterDeclarations = getRecordEntry(agentParameters[upstreamAgentNodeId], nodeGraphId);
  return convertAgentParameterToOutputToken(agentParameterDeclarations);
};

export const convertAgentParameterToOutputToken = (agentParameters?: AgentParameterDeclarations): OutputToken[] => {
  if (!agentParameters) {
    return [];
  }
  return Object.entries(agentParameters).map(([key, agentParameter]) => {
    const { type, description } = agentParameter;
    const name = key;
    return {
      key: `agentParameter:${name}`,
      brandColor: AgentParameterBrandColor,
      icon: AgentParameterIcon,
      title: name,
      name,
      type,
      description,
      isAdvanced: false,
      outputInfo: {
        type: TokenType.AGENTPARAMETER,
        functionName: Constants.FUNCTION_NAME.AGENT_PARAMETERS,
        functionArguments: [name],
      },
    };
  });
};
