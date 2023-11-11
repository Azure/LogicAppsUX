import Constants from '../../common/constants';
import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { Settings } from '../actions/bjsworkflow/settings';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { NodeOperation, OutputInfo } from '../state/operation/operationMetadataSlice';
import { updateRepetitionContext } from '../state/operation/operationMetadataSlice';
import type { TokensState } from '../state/tokens/tokensSlice';
import type { NodesMetadata } from '../state/workflow/workflowInterfaces';
import type { WorkflowParameterDefinition, WorkflowParametersState } from '../state/workflowparameters/workflowparametersSlice';
import type { AppDispatch, RootState } from '../store';
import { getAllNodesInsideNode, getTriggerNodeId, getUpstreamNodeIds } from './graph';
import {
  addForeachToNode,
  getForeachActionName,
  getRepetitionContext,
  getRepetitionNodeIds,
  getTokenExpressionValueForManifestBasedOperation,
  shouldAddForeach,
} from './loops';
import { removeAliasingKeyRedundancies } from './outputs';
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
  remapTokenSegmentValue,
  shouldIncludeSelfForRepetitionReference,
} from './parameters/helper';
import { createTokenValueSegment } from './parameters/segment';
import { getSplitOnValue, hasSecureOutputs } from './setting';
import { getVariableTokens } from './variables';
import { OperationManifestService , UIConstants, TemplateFunctions, TokenType , getIntl , getKnownTitles, OutputKeys , labelCase, unmap, equals, filterRecord } from '@microsoft/logic-apps-designer';
import type { FunctionDefinition, OutputToken, Token, ValueSegment , BuiltInOutput, OperationManifest } from '@microsoft/logic-apps-designer';

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
  let tokenNodeIds = getUpstreamNodeIds(nodeId, graph, nodesMetadata, operationMap);
  const manifest = nodesManifest[nodeId]?.manifest;

  const preliminaryRepetitionNodeIds = getRepetitionNodeIds(nodeId, nodesMetadata, operationInfos);
  // Remove token nodes that have inaccessible outputs due to loop scope
  tokenNodeIds = tokenNodeIds.filter((tokenNodeId) => {
    const tokenRepititionNodes = getRepetitionNodeIds(tokenNodeId, nodesMetadata, operationInfos);
    // filter out if repetitionNodeIds does not contain all of tokenRepititionNodes
    return tokenRepititionNodes.every((tokenRepititionId) => preliminaryRepetitionNodeIds.includes(tokenRepititionId));
  });

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
        tokenNodeIds.push(repetitionNodeId);
      }
    }

    if (manifest.properties?.outputTokens?.selfReference) {
      const allNodesInsideNode = getAllNodesInsideNode(nodeId, graph, operationMap);
      tokenNodeIds.push(...allNodesInsideNode);
    }
  }

  return Array.from(new Set(tokenNodeIds));
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
    const {
      key,
      name,
      type,
      isAdvanced,
      required,
      format,
      source,
      isInsideArray,
      isDynamic,
      parentArray,
      itemSchema,
      schema,
      value,
      alias,
      description,
    } = outputs[outputKey];
    return {
      key: alias ? removeAliasingKeyRedundancies(key) : key,
      brandColor,
      icon,
      title: getTokenTitle(outputs[outputKey]),
      name,
      type,
      value,
      description,
      isAdvanced,
      outputInfo: {
        type: nodeType.toLowerCase() === Constants.NODE.TYPE.FOREACH ? TokenType.ITEM : TokenType.OUTPUTS,
        required,
        format,
        source,
        isSecure,
        isDynamic,
        actionName: nodeId,
        arrayDetails: isInsideArray ? { itemSchema, parentArray } : undefined,
        schema,
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
  replacementIds: Record<string, string>,
  includeCurrentNodeTokens = false
): TokenGroup[] => {
  const workflowParameters = filterRecord(workflowParametersState.definitions, (_, defintion) => defintion.name !== '');
  const { variables, outputTokens } = tokenState;
  const nodeTokens = outputTokens[nodeId];
  const tokenGroups: TokenGroup[] = [];

  if (Object.keys(workflowParameters).length) {
    tokenGroups.push({
      id: 'workflowparameters',
      label: getIntl().formatMessage({ description: 'Heading section for Parameter tokens', defaultMessage: 'Parameters' }),
      tokens: getWorkflowParameterTokens(workflowParameters),
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

    if (includeCurrentNodeTokens) {
      let currentTokens = outputTokens[nodeId]?.tokens ?? [];
      currentTokens = currentTokens.map((token) => {
        return {
          ...token,
          value: rewriteValueId(token.outputInfo.actionName ?? '', getExpressionValueForOutputToken(token, nodeType) ?? '', replacementIds),
        };
      });

      if (currentTokens.length) {
        const currentTokensGroup = {
          id: nodeId,
          label: labelCase(replacementIds[nodeId] ?? nodeId),
          tokens: currentTokens,
          hasAdvanced: currentTokens.some((token) => token.isAdvanced),
          showAdvanced: false,
        };

        outputTokenGroups.push(currentTokensGroup);
      }
    }

    tokenGroups.push(...(outputTokenGroups.filter((group) => !!group) as TokenGroup[]));
  }

  return tokenGroups;
};

export const createValueSegmentFromToken = async (
  nodeId: string,
  parameterId: string,
  token: OutputToken,
  addImplicitForeachIfNeeded: boolean,
  addLatestActionName: boolean,
  rootState: RootState,
  dispatch: AppDispatch
): Promise<ValueSegment> => {
  const tokenOwnerNodeId = token.outputInfo.actionName ?? getTriggerNodeId(rootState.workflow);
  const nodeType = rootState.operations.operationInfo[tokenOwnerNodeId].type;
  const idReplacements = rootState.workflow.idReplacements;
  const tokenValueSegment = convertTokenToValueSegment(token, nodeType, idReplacements);

  if (addLatestActionName && tokenValueSegment.token?.actionName) {
    const newActionId = idReplacements[tokenValueSegment.token.actionName];
    if (newActionId && newActionId !== tokenValueSegment.token.actionName) {
      tokenValueSegment.token.actionName = newActionId;
    }
  }

  if (!addImplicitForeachIfNeeded) {
    return tokenValueSegment;
  }

  if (tokenValueSegment.token?.tokenType !== TokenType.PARAMETER && tokenValueSegment.token?.tokenType !== TokenType.VARIABLE) {
    const tokenOwnerActionName = token.outputInfo.actionName;
    const tokenOwnerOperationInfo = rootState.operations.operationInfo[tokenOwnerNodeId];
    const { shouldAdd, arrayDetails, repetitionContext } = await shouldAddForeach(nodeId, parameterId, token, rootState);
    let newRootState = rootState;
    let newRepetitionContext = repetitionContext;

    if (shouldAdd) {
      const { payload: newState } = await dispatch(addForeachToNode({ arrayDetails, nodeId, token }));
      newRootState = newState as RootState;
      newRepetitionContext = await getRepetitionContext(
        nodeId,
        newRootState.operations.operationInfo,
        newRootState.operations.inputParameters,
        newRootState.workflow.nodesMetadata,
        /* includeSelf */ false,
        getSplitOnValue(newRootState.workflow, newRootState.operations),
        newRootState.workflow.idReplacements
      );
    }

    if (newRepetitionContext) {
      dispatch(updateRepetitionContext({ id: nodeId, repetition: newRepetitionContext }));
    }

    if (arrayDetails?.length && newRepetitionContext) {
      (tokenValueSegment.token as Token).arrayDetails = {
        ...tokenValueSegment.token?.arrayDetails,
        loopSource: getForeachActionName(newRepetitionContext, arrayDetails[0].parentArrayKey, tokenOwnerActionName),
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
          tokenOwnerActionName,
          !!tokenValueSegment.token?.required
        );
      } else {
        ensureExpressionValue(tokenValueSegment, /* calculateValue */ true);
      }
    }

    if (tokenValueSegment.token) {
      tokenValueSegment.token.value = remapTokenSegmentValue(tokenValueSegment, rootState.workflow.idReplacements).value.value;
    }
  }

  return tokenValueSegment;
};

const getTokenValueSegmentTokenType = (token: OutputToken, nodeType: string): TokenType => {
  const { key } = token;

  if (nodeType.toLowerCase() === Constants.NODE.TYPE.FOREACH) {
    return TokenType.ITEM;
  } else if (key === Constants.UNTIL_CURRENT_ITERATION_INDEX_KEY) {
    return TokenType.ITERATIONINDEX;
  } else if (token.outputInfo?.functionName) {
    return equals(token.outputInfo.functionName, Constants.FUNCTION_NAME.PARAMETERS) ? TokenType.PARAMETER : TokenType.VARIABLE;
  }
  return TokenType.OUTPUTS;
};

const convertTokenToValueSegment = (token: OutputToken, nodeType: string, replacementIds: Record<string, string>): ValueSegment => {
  const tokenType = getTokenValueSegmentTokenType(token, nodeType);
  const { key, brandColor, icon, title, description, name, type, outputInfo } = token;
  const { actionName, required, format, source, isSecure, arrayDetails, schema } = outputInfo;
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
    schema,
    value: rewriteValueId(token.outputInfo.actionName ?? '', getExpressionValueForOutputToken(token, nodeType) ?? '', replacementIds),
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
  return value.replaceAll(id, replacementIds[id] ?? id);
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
