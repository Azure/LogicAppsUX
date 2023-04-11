import Constants from '../../common/constants';
import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { Settings } from '../actions/bjsworkflow/settings';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { NodeOperation, OutputInfo } from '../state/operation/operationMetadataSlice';
import type { TokensState } from '../state/tokensSlice';
import type { NodesMetadata } from '../state/workflow/workflowInterfaces';
import type { WorkflowParameterDefinition, WorkflowParametersState } from '../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../store';
import { getAllNodesInsideNode, getTriggerNodeId, getUpstreamNodeIds } from './graph';
import { getForeachActionName, getRepetitionNodeIds, getTokenExpressionValueForManifestBasedOperation, shouldAddForeach } from './loops';
import {
  ensureExpressionValue,
  FxBrandColor,
  FxIcon,
  getExpressionValueForOutputToken,
  getTokenValueFromToken,
  httpWebhookBrandColor,
  httpWebhookIcon,
  ParameterBrandColor,
  ParameterIcon,
  shouldIncludeSelfForRepetitionReference,
} from './parameters/helper';
import { createTokenValueSegment } from './parameters/segment';
import { hasSecureOutputs } from './setting';
import { getVariableTokens } from './variables';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { FunctionDefinition, OutputToken, Token, ValueSegment } from '@microsoft/designer-ui';
import { UIConstants, TemplateFunctions, TokenType } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import { getKnownTitles, OutputKeys } from '@microsoft/parsers-logic-apps';
import type { BuiltInOutput, OperationManifest } from '@microsoft/utils-logic-apps';
import { labelCase, unmap, equals } from '@microsoft/utils-logic-apps';

export interface TokenGroup {
  id: string;
  label: string;
  tokens: OutputToken[];
  hasAdvanced?: boolean;
  showAdvanced?: boolean;
}

export const getTokenNodeIds = (
  nodeId: string,
  graph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  nodesManifest: Record<string, NodeDataWithOperationMetadata>,
  operationInfos: Record<string, NodeOperation>,
  operationMap: Record<string, string>
): string[] => {
  const tokenNodes = getUpstreamNodeIds(nodeId, graph, nodesMetadata, operationMap);
  const manifest = nodesManifest[nodeId]?.manifest;

  if (manifest) {
    // Should include itself as repetition reference if nodes can reference its outputs
    // generated by its inputs like Query, Select and Table operations.
    const includeSelf = shouldIncludeSelfForRepetitionReference(manifest);
    const repetitionNodeIds = getRepetitionNodeIds(nodeId, nodesMetadata, operationInfos, includeSelf);

    for (const repetitionNodeId of repetitionNodeIds) {
      const nodeManifest = nodesManifest[repetitionNodeId]?.manifest;
      // If repetition is set for a node but not set for self reference,
      // then nodes having this type as repetition can reference its outputs like Foreach and Until
      if (nodeManifest?.properties.repetition && !nodeManifest.properties.repetition.self) {
        tokenNodes.push(repetitionNodeId);
      }
    }

    if (manifest.properties?.outputTokens?.selfReference) {
      const allNodesInsideNode = getAllNodesInsideNode(nodeId, graph, operationMap);
      tokenNodes.push(...allNodesInsideNode);
    }
  }

  return tokenNodes;
};

export const getBuiltInTokens = (manifest?: OperationManifest): OutputToken[] => {
  if (!manifest) {
    return [];
  }

  const icon = manifest.properties.iconUri;
  const brandColor = manifest.properties.brandColor;

  return (manifest.properties.outputTokens?.builtIns || []).map(({ name, title, required, type }: BuiltInOutput) => ({
    key: `system.$.function.${name}`,
    brandColor,
    icon,
    title,
    name,
    type,
    isAdvanced: false,
    outputInfo: {
      type: TokenType.OUTPUTS,
      required,
    },
  }));
};

export const convertOutputsToTokens = (
  nodeId: string | undefined,
  nodeType: string,
  outputs: Record<string, OutputInfo>,
  operationMetadata: { iconUri: string; brandColor: string },
  settings?: Settings
): OutputToken[] => {
  const { iconUri: icon, brandColor } = operationMetadata;
  const isSecure = hasSecureOutputs(nodeType, settings);

  // TODO - Look at repetition context to get foreach context correctly in tokens and for splitOn

  return Object.keys(outputs).map((outputKey) => {
    const { key, name, type, isAdvanced, required, format, source, isInsideArray, parentArray, itemSchema, value } = outputs[outputKey];
    return {
      key,
      brandColor,
      icon,
      title: getTokenTitle(outputs[outputKey]),
      name,
      type,
      value,
      isAdvanced,
      outputInfo: {
        type: TokenType.OUTPUTS,
        required,
        format,
        source,
        isSecure,
        actionName: nodeId,
        arrayDetails: isInsideArray ? { itemSchema, parentArray } : undefined,
      },
    };
  });
};

export const getExpressionTokenSections = (): TokenGroup[] => {
  return TemplateFunctions.map((functionGroup) => {
    const { id, name, functions } = functionGroup;
    const hasAdvanced = functions.some((func) => func.isAdvanced);
    const tokens = functions.map(({ name, defaultSignature, description, isAdvanced }: FunctionDefinition) => ({
      key: name,
      brandColor: FxBrandColor,
      icon: FxIcon,
      title: defaultSignature,
      name,
      type: Constants.SWAGGER.TYPE.ANY,
      description,
      isAdvanced,
      outputInfo: {
        type: TokenType.FX,
        functionName: name,
      },
    }));

    return {
      id,
      label: name,
      hasAdvanced,
      showAdvanced: false,
      tokens,
    };
  });
};

export const getOutputTokenSections = (
  nodeId: string,
  nodeType: string,
  tokenState: TokensState,
  workflowParametersState: WorkflowParametersState,
  replacementIds: Record<string, string>
): TokenGroup[] => {
  const { definitions } = workflowParametersState;
  const { variables, outputTokens } = tokenState;
  const nodeTokens = outputTokens[nodeId];
  const tokenGroups: TokenGroup[] = [];

  if (Object.keys(definitions).length) {
    tokenGroups.push({
      id: 'workflowparameters',
      label: getIntl().formatMessage({ description: 'Heading section for Parameter tokens', defaultMessage: 'Parameters' }),
      tokens: getWorkflowParameterTokens(definitions),
    });
  }

  if (nodeTokens) {
    tokenGroups.push({
      id: 'variables',
      label: getIntl().formatMessage({ description: 'Heading section for Variable tokens', defaultMessage: 'Variables' }),
      tokens: getVariableTokens(variables, nodeTokens).map((token) => ({
        ...token,
        value: rewriteValueId(token.outputInfo.actionName ?? '', getExpressionValueForOutputToken(token, nodeType) ?? '', replacementIds),
      })),
    });

    if (nodeType.toLowerCase() === Constants.NODE.TYPE.HTTP_WEBHOOK) {
      tokenGroups.push(getListCallbackUrlToken(nodeId));
    }

    const outputTokenGroups = nodeTokens.upstreamNodeIds.map((upstreamNodeId) => {
      let tokens = outputTokens[upstreamNodeId]?.tokens ?? [];
      tokens = tokens.map((token) => {
        return {
          ...token,
          value: rewriteValueId(token.outputInfo.actionName ?? '', getExpressionValueForOutputToken(token, nodeType) ?? '', replacementIds),
        };
      });

      if (!tokens.length) {
        return undefined;
      }

      return {
        id: upstreamNodeId,
        label: labelCase(replacementIds[upstreamNodeId] ?? upstreamNodeId),
        tokens,
        hasAdvanced: tokens.some((token) => token.isAdvanced),
        showAdvanced: false,
      };
    });

    tokenGroups.push(...(outputTokenGroups.filter((group) => !!group) as TokenGroup[]));
  }

  return tokenGroups;
};

export const createValueSegmentFromToken = async (
  nodeId: string,
  parameterId: string,
  token: OutputToken,
  addImplicitForeachIfNeeded: boolean,
  rootState: RootState
): Promise<{ segment: ValueSegment; foreachDetails?: { arrayValue: string | undefined } }> => {
  const tokenOwnerNodeId = token.outputInfo.actionName ?? getTriggerNodeId(rootState.workflow);
  const nodeType = rootState.operations.operationInfo[tokenOwnerNodeId].type;
  const tokenValueSegment = convertTokenToValueSegment(token, nodeType);

  if (!addImplicitForeachIfNeeded) {
    return { segment: tokenValueSegment };
  }

  if (tokenValueSegment.token?.tokenType !== TokenType.PARAMETER && tokenValueSegment.token?.tokenType !== TokenType.VARIABLE) {
    const tokenOwnerActionName = token.outputInfo.actionName;
    const tokenOwnerOperationInfo = rootState.operations.operationInfo[tokenOwnerNodeId];
    const { shouldAdd, parentArrayKey, parentArrayValue, repetitionContext } = await shouldAddForeach(
      nodeId,
      parameterId,
      token,
      rootState
    );

    if (parentArrayKey && repetitionContext) {
      (tokenValueSegment.token as Token).arrayDetails = {
        ...tokenValueSegment.token?.arrayDetails,
        loopSource: getForeachActionName(repetitionContext, parentArrayKey, tokenOwnerActionName),
      };
    }

    if (equals(tokenOwnerOperationInfo.type, Constants.NODE.TYPE.FOREACH)) {
      (tokenValueSegment.token as Token).arrayDetails = {
        ...tokenValueSegment.token?.arrayDetails,
        loopSource: tokenOwnerActionName,
      };
    }

    if (tokenValueSegment.token?.arrayDetails?.loopSource) {
      // NOTE: The foreach 'loopSource' may have been updated above.
      // Evaluate the expression value again to make sure the latest 'loopSource' is picked up.
      if (OperationManifestService().isSupported(tokenOwnerOperationInfo.type, tokenOwnerOperationInfo.kind)) {
        tokenValueSegment.value = getTokenExpressionValueForManifestBasedOperation(
          token.key,
          !!tokenValueSegment.token?.arrayDetails,
          tokenValueSegment.token?.arrayDetails?.loopSource,
          tokenOwnerActionName
        );
      } else {
        ensureExpressionValue(tokenValueSegment);
      }
    }

    if (tokenValueSegment.token) {
      const oldId = tokenValueSegment.token.actionName ?? '';
      const newId = rootState.workflow.idReplacements[oldId] ?? oldId;
      tokenValueSegment.token.remappedValue = tokenValueSegment.value.replace(oldId, newId);
    }

    return shouldAdd ? { segment: tokenValueSegment, foreachDetails: { arrayValue: parentArrayValue } } : { segment: tokenValueSegment };
  }

  return { segment: tokenValueSegment };
};

const convertTokenToValueSegment = (token: OutputToken, nodeType: string): ValueSegment => {
  const tokenType = equals(nodeType, Constants.NODE.TYPE.FOREACH)
    ? TokenType.ITEM
    : token.outputInfo?.functionName
    ? equals(token.outputInfo.functionName, Constants.FUNCTION_NAME.PARAMETERS)
      ? TokenType.PARAMETER
      : TokenType.VARIABLE
    : TokenType.OUTPUTS;

  const { key, brandColor, icon, title, description, name, type, outputInfo } = token;
  const { actionName, required, format, source, isSecure, arrayDetails } = outputInfo;
  const segmentToken: Token = {
    key,
    name,
    type,
    title,
    brandColor,
    icon,
    description,
    tokenType,
    actionName,
    required,
    format,
    isSecure,
    source,
    arrayDetails: arrayDetails
      ? {
          parentArrayName: arrayDetails.parentArray,
          itemSchema: arrayDetails.itemSchema,
          loopSource: equals(nodeType, Constants.NODE.TYPE.UNTIL) ? actionName : undefined,
        }
      : undefined,
    value: getExpressionValueForOutputToken(token, nodeType),
  };

  return createTokenValueSegment(segmentToken, segmentToken.value as string, format);
};

const getTokenTitle = (output: OutputInfo): string => {
  if (output.title) {
    return output.title;
  }

  const itemToken = getKnownTitles(OutputKeys.Item);
  if (output.isInsideArray) {
    return output.parentArray ? `${output.parentArray} - ${itemToken}` : itemToken;
  }

  return output.name ? getKnownTitles(output.name) : getKnownTitles(OutputKeys.Body);
};

const getWorkflowParameterTokens = (definitions: Record<string, WorkflowParameterDefinition>): OutputToken[] => {
  return unmap(definitions).map(({ name, type }: WorkflowParameterDefinition) => {
    return {
      key: `parameters:${name}`,
      brandColor: ParameterBrandColor,
      icon: ParameterIcon,
      title: name,
      name,
      type: convertWorkflowParameterTypeToSwaggerType(type),
      isAdvanced: false,
      outputInfo: {
        type: TokenType.PARAMETER,
        functionName: Constants.FUNCTION_NAME.PARAMETERS,
        functionArguments: [name],
      },
      value: getTokenValueFromToken(TokenType.PARAMETER, [name]),
    };
  });
};

export const convertWorkflowParameterTypeToSwaggerType = (type: string | undefined): string => {
  switch (type?.toLowerCase()) {
    case UIConstants.WORKFLOW_PARAMETER_TYPE.FLOAT:
      return Constants.SWAGGER.TYPE.NUMBER;
    case UIConstants.WORKFLOW_PARAMETER_TYPE.INTEGER:
    case UIConstants.WORKFLOW_PARAMETER_TYPE.INT:
      return Constants.SWAGGER.TYPE.INTEGER;
    case UIConstants.WORKFLOW_PARAMETER_TYPE.BOOLEAN:
    case UIConstants.WORKFLOW_PARAMETER_TYPE.BOOL:
      return Constants.SWAGGER.TYPE.BOOLEAN;
    case UIConstants.WORKFLOW_PARAMETER_TYPE.STRING:
      return Constants.SWAGGER.TYPE.STRING;
    case UIConstants.WORKFLOW_PARAMETER_TYPE.ARRAY:
      return Constants.SWAGGER.TYPE.ARRAY;
    case UIConstants.WORKFLOW_PARAMETER_TYPE.OBJECT:
      return Constants.SWAGGER.TYPE.OBJECT;
    default:
      return Constants.SWAGGER.TYPE.ANY;
  }
};

const rewriteValueId = (id: string, value: string, replacementIds: Record<string, string>): string => {
  return value.replace(id, replacementIds[id] ?? id);
};
const getListCallbackUrlToken = (nodeId: string): TokenGroup => {
  const callbackUrlToken: OutputToken = {
    brandColor: httpWebhookBrandColor,
    key: `${Constants.KEY_SEGMENTS.SYSTEM}.${Constants.DEFAULT_KEY_PREFIX}.${Constants.KEY_SEGMENTS.FUNCTION}.${Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME}`,
    title: getIntl().formatMessage({
      defaultMessage: 'Callback url',
      description: 'Callback url token title',
    }),
    type: Constants.SWAGGER.TYPE.OBJECT,
    icon: httpWebhookIcon,
    name: Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME,
    value: Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME,
    outputInfo: {
      type: TokenType.OUTPUTS,
      required: false,
      isSecure: false,
      source: Constants.OUTPUTS,
    },
  };

  return {
    hasAdvanced: false,
    label: getIntl().formatMessage({
      defaultMessage: 'Webhook reference information',
      description: 'httpwebhook callback url section title',
    }),
    id: nodeId,
    tokens: [callbackUrlToken],
  };
};
