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
  const nodesWithData: Record<string, NodeDataWithOperationMetadata> = {};
  for (const node of allNodesData) {
    nodesWithData[node.id] = node;
  }

  agentConditions.forEach((agentCondition) => {
    const nodeInputs = getRecordEntry(nodesWithData, agentCondition)?.nodeInputs.parameterGroups;
    if (nodeInputs) {
      const agent = nodeInputs[ParameterGroupKeys.DEFAULT].rawInputs.find(
        (input) => input.name === Constants.PARAMETER_NAMES.AGENT_PARAMETERS
      )?.value;
      if (agent) {
        const agentNodeId = getRecordEntry(nodesMetadata, agentCondition)?.parentNodeId;
        if (agentNodeId) {
          agentParameters[agentNodeId] = agentParameters[agent] ?? {};
          agentParameters[agentNodeId][agentCondition] = agent;
        }
      }
    }
  });
  return agentParameters;
};

export const getAgentParameterTokens = (
  nodeId: string,
  agentParameters: Record<string, AgentParameters>,
  nodesMetadata: NodesMetadata
): OutputToken[] | undefined => {
  const nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;
  const upstreamAgentConditionId =
    nodeGraphId && getRecordEntry(nodesMetadata, nodeGraphId)?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION ? nodeGraphId : undefined;
  const upstreamAgentNodeId = getRecordEntry(nodesMetadata, upstreamAgentConditionId)?.parentNodeId;
  if (upstreamAgentConditionId && upstreamAgentNodeId) {
    const agentParameterDeclarations = getRecordEntry(getRecordEntry(agentParameters, upstreamAgentNodeId), upstreamAgentConditionId);
    return convertAgentParameterToOutputToken(agentParameterDeclarations);
  }
  return undefined;
};

export const convertAgentParameterToOutputToken = (agentParameters?: AgentParameterDeclarations): OutputToken[] => {
  if (!agentParameters) {
    return [];
  }
  return Object.entries(agentParameters).map(([_name, agentParameter]) => {
    const { name: parameterName, type, description } = agentParameter;
    const name = parameterName ?? _name;
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
