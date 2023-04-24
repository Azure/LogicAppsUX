import Constants from '../../common/constants';
import { addTokensAndVariables } from '../actions/bjsworkflow/add';
import { updateAllUpstreamNodes } from '../actions/bjsworkflow/initialize';
import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import { initializeOperationDetailsForManifest } from '../actions/bjsworkflow/operationdeserializer';
import { getOperationManifest } from '../queries/operation';
import type { NodeInputs, NodeOperation, NodeOutputs, OperationMetadataState } from '../state/operation/operationMetadataSlice';
import { initializeNodes } from '../state/operation/operationMetadataSlice';
import type { NodesMetadata, Operations } from '../state/workflow/workflowInterfaces';
import { addImplicitForeachNode } from '../state/workflow/workflowSlice';
import type { RootState } from '../store';
import { getAllParentsForNode, getNewNodeId, getTriggerNodeId } from './graph';
import type { RepetitionContext, RepetitionReference } from './parameters/helper';
import {
  generateExpressionFromKey,
  getAllInputParameters,
  updateTokenMetadata,
  getParameterFromId,
  getTokenExpressionValue,
  getJSONValueFromString,
  getParameterFromName,
  parameterValueToString,
  shouldIncludeSelfForRepetitionReference,
} from './parameters/helper';
import { isTokenValueSegment } from './parameters/segment';
import { TokenSegmentConvertor } from './parameters/tokensegment';
import { foreachOperationInfo, OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { OutputToken, Token } from '@microsoft/designer-ui';
import { TokenType } from '@microsoft/designer-ui';
import type { Dereference, Expression, ExpressionFunction, ExpressionLiteral, Segment } from '@microsoft/parsers-logic-apps';
import {
  containsWildIndexSegment,
  convertToStringLiteral,
  isAncestorKey,
  create,
  createEx,
  ExpressionParser,
  ExpressionType,
  isFunction,
  isStringLiteral,
  isTemplateExpression,
  OutputKeys,
  parseEx,
  SegmentType,
} from '@microsoft/parsers-logic-apps';
import { equals, first, isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { createAsyncThunk } from '@reduxjs/toolkit';

interface ImplicitForeachDetails {
  shouldAdd: boolean;
  parentArrayKey?: string;
  parentArrayValue?: string;
  repetitionContext?: RepetitionContext;
}

export const shouldAddForeach = async (
  nodeId: string,
  token: OutputToken,
  state: RootState,
  parameterId?: string
): Promise<ImplicitForeachDetails> => {
  if (token.outputInfo.type === TokenType.VARIABLE || token.outputInfo.type === TokenType.PARAMETER || !token.outputInfo?.arrayDetails) {
    return { shouldAdd: false };
  }

  const operationInfo = state.operations.operationInfo[nodeId];
  let includeSelf = false;
  if (parameterId) {
    const parameter = getParameterFromId(state.operations.inputParameters[nodeId], parameterId);
    const manifest = OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)
      ? await getOperationManifest(operationInfo)
      : undefined;
    includeSelf = manifest ? shouldIncludeSelfForRepetitionReference(manifest, parameter?.parameterName) : false;
  }

  const repetitionContext = await getRepetitionContext(nodeId, state, includeSelf);
  const tokenOwnerNodeId = token.outputInfo.actionName ?? getTriggerNodeId(state.workflow);
  const parentArrayKey = getParentArrayKey(token.key);
  const parentArrayValue = getParentArrayExpression(
    token.outputInfo.actionName,
    parentArrayKey,
    repetitionContext,
    state.operations.outputParameters[tokenOwnerNodeId],
    state.operations.operationInfo[tokenOwnerNodeId]
  ) as string;
  const isSplitOn = isExpressionEqualToNodeSplitOn(
    parentArrayValue,
    state.operations.settings[tokenOwnerNodeId].splitOn?.value?.enabled
      ? state.operations.settings[tokenOwnerNodeId].splitOn?.value?.value
      : undefined
  );
  // TODO: Need a way to determine if token is item token already
  const alreadyInLoop = repetitionContext.repetitionReferences.some(
    (repetitionReference) =>
      typeof repetitionReference.repetitionValue === 'string' && equals(repetitionReference.repetitionValue, parentArrayValue)
  );

  // TODO: Need to handle array of array as input.
  return { shouldAdd: !isSplitOn && !alreadyInLoop, parentArrayKey, parentArrayValue, repetitionContext };
};

export const addForeachToNode = createAsyncThunk(
  'addForeachToNode',
  async (payload: { nodeId: string; arrayName: string | undefined; token: OutputToken }, { dispatch, getState }): Promise<void> => {
    const { nodeId, arrayName, token } = payload;
    if (!arrayName) {
      throw new Error('The value for foreach property should not be empty');
    }

    // Adding foreach node.
    const foreachNodeId = getNewNodeId((getState() as RootState).workflow, 'For_each');
    dispatch(addImplicitForeachNode({ nodeId, foreachNodeId, operation: { type: Constants.NODE.TYPE.FOREACH, foreach: arrayName } }));

    const newState = getState() as RootState;

    // Initializing details for newly added foreach operation.
    const foreachOperation = newState.workflow.operations[foreachNodeId];
    const [{ nodeInputs, nodeOutputs, nodeDependencies, settings }] = (await initializeOperationDetailsForManifest(
      foreachNodeId,
      foreachOperation,
      /* isTrigger */ false,
      dispatch
    )) as NodeDataWithOperationMetadata[];
    updateTokenMetadataInForeachInputs(nodeInputs, token, newState);
    const manifest = await getOperationManifest(foreachOperationInfo);
    const { iconUri, brandColor } = manifest.properties;
    const initData = { id: foreachNodeId, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata: { iconUri, brandColor } };
    dispatch(initializeNodes([initData]));
    addTokensAndVariables(foreachNodeId, Constants.NODE.TYPE.FOREACH, { ...initData, manifest }, newState, dispatch);

    updateAllUpstreamNodes(getState() as RootState, dispatch);
    return;
  }
);

export const getRepetitionNodeIds = (
  nodeId: string,
  nodesMetadata: NodesMetadata,
  operationInfos: Record<string, NodeOperation>,
  includeSelf?: boolean
): string[] => {
  const allParentNodeIds = getAllParentsForNode(nodeId, nodesMetadata);
  const repetitionNodeIds = allParentNodeIds.filter((parentId) => isLoopingNode(parentId, operationInfos));

  if (includeSelf) {
    repetitionNodeIds.unshift(nodeId);
  }

  return repetitionNodeIds;
};

export const getRepetitionContext = async (nodeId: string, state: RootState, includeSelf: boolean): Promise<RepetitionContext> => {
  const repetitionNodeIds = getRepetitionNodeIds(nodeId, state.workflow.nodesMetadata, state.operations.operationInfo, includeSelf);
  const triggerNodeId = getTriggerNodeId(state.workflow);
  const splitOn =
    triggerNodeId && state.operations.settings[triggerNodeId].splitOn?.value?.enabled
      ? (state.operations.settings[triggerNodeId].splitOn?.value?.value as string)
      : undefined;

  const repetitionReferences = (
    await Promise.all(
      repetitionNodeIds.map((repetitionNodeId) => getRepetitionReference(repetitionNodeId, state.operations, state.workflow.idReplacements))
    )
  ).filter((reference) => !!reference) as RepetitionReference[];

  const parentReferences: RepetitionReference[] = [];
  for (let i = repetitionReferences.length - 1; i >= 0; i--) {
    const repetitionReference = repetitionReferences[i];
    if (
      typeof repetitionReference.repetitionValue === 'string' &&
      repetitionReference.actionType !== Constants.NODE.TYPE.UNTIL &&
      isTemplateExpression(repetitionReference.repetitionValue)
    ) {
      const foreach = parseForeach(repetitionReference.repetitionValue, {
        splitOn,
        repetitionReferences: parentReferences,
      });
      repetitionReference.repetitionPath = foreach.fullPath;
      repetitionReference.repetitionStep = foreach.step;
    }
    parentReferences.unshift(repetitionReference);
  }

  // TODO: Might need to update the aliased values for repetition references for open api.

  return {
    repetitionReferences,
    splitOn,
  };
};

const getParentArrayExpression = (
  tokenOwnerActionName: string | undefined,
  parentArrayKey: string | undefined,
  repetitionContext: RepetitionContext,
  nodeOutputs: NodeOutputs,
  operationInfo: NodeOperation
): string | undefined => {
  if (!parentArrayKey) {
    return undefined;
  }

  const sanitizedParentArrayKey = sanitizeKey(parentArrayKey);

  const parentArrayOutput = nodeOutputs.outputs[parentArrayKey];

  const parentArrayTokenInfo: Token = {
    actionName: tokenOwnerActionName,
    key: parentArrayKey,
    tokenType: TokenType.OUTPUTS,
    title: parentArrayKey,
  };

  if (parentArrayOutput) {
    parentArrayTokenInfo.required = parentArrayOutput.required;
    parentArrayTokenInfo.name = parentArrayOutput.name;
    parentArrayTokenInfo.source = parentArrayOutput.source;
  }

  const areOutputsManifestBased = OperationManifestService().isSupported(operationInfo.type, operationInfo.kind);

  for (const repetitionReference of repetitionContext.repetitionReferences) {
    if (
      equals(sanitizedParentArrayKey, repetitionReference.repetitionPath) &&
      ((isNullOrUndefined(tokenOwnerActionName) && isNullOrUndefined(repetitionReference.repetitionStep)) ||
        equals(tokenOwnerActionName, repetitionReference.repetitionStep))
    ) {
      return repetitionReference.repetitionValue;
    } else if (
      isAncestorKey(sanitizedParentArrayKey, repetitionReference.repetitionPath) &&
      ((isNullOrUndefined(tokenOwnerActionName) && isNullOrUndefined(repetitionReference.repetitionStep)) ||
        equals(tokenOwnerActionName, repetitionReference.repetitionStep))
    ) {
      const extraSegments = getExtraSegments(parentArrayKey, repetitionReference.repetitionPath);
      // NOTE: if after the foreach repetition path between parent array path, it still contains one index segment
      // we need to treat it as items('parentLoopSource') if inside foreach, or item() if in other repetition supporting nodes
      if (extraSegments.filter((segment) => segment.type === SegmentType.Index).length === 1) {
        parentArrayTokenInfo.arrayDetails = {
          loopSource: equals(repetitionReference.actionType, Constants.NODE.TYPE.FOREACH) ? repetitionReference.actionName : undefined,
        };
      }
    }
  }

  return areOutputsManifestBased
    ? `@${getTokenExpressionValueForManifestBasedOperation(
        parentArrayTokenInfo.key,
        !!parentArrayTokenInfo.arrayDetails,
        parentArrayTokenInfo.arrayDetails?.loopSource,
        tokenOwnerActionName,
        !!parentArrayTokenInfo.required
      )}`
    : `@${getTokenExpressionValue(parentArrayTokenInfo)}`;
};

// Directly checking the node type, because cannot make async calls while adding token from picker to editor.
// TODO - See if this can be made async and looked at manifest.
export const isLoopingNode = (nodeId: string, operationInfos: Record<string, NodeOperation>): boolean => {
  const nodeType = operationInfos[nodeId]?.type;
  return equals(nodeType, Constants.NODE.TYPE.FOREACH) || equals(nodeType, Constants.NODE.TYPE.UNTIL);
};

export const getForeachActionName = (
  context: RepetitionContext,
  foreachExpressionPath: string,
  repetitionStep: string | undefined
): string | undefined => {
  const sanitizedPath = sanitizeKey(foreachExpressionPath);
  const foreachAction = first(
    (item) =>
      equals(item.actionType, Constants.NODE.TYPE.FOREACH) &&
      equals(item.repetitionPath, sanitizedPath) &&
      item.repetitionStep === repetitionStep,
    context.repetitionReferences
  );
  return foreachAction?.actionName;
};

export const isForeachActionNameForLoopsource = (
  nodeId: string,
  expression: string,
  nodes: Record<string, Partial<NodeDataWithOperationMetadata>>,
  operations: Operations,
  nodesMetadata: NodesMetadata
): boolean => {
  const operationInfos = Object.keys(operations).reduce(
    (result: Record<string, NodeOperation>, operationId) => ({
      ...result,
      [operationId]: {
        type: operations[operationId]?.type,
        kind: operations[operationId]?.kind,
        connectorId: '',
        operationId: '',
      },
    }),
    {}
  );
  const repetitionNodeIds = getRepetitionNodeIds(nodeId, nodesMetadata, operationInfos);
  const sanitizedPath = sanitizeKey(expression);
  const foreachAction = first((item) => {
    const operation = operationInfos[item];
    const parameter = nodes[item]?.nodeInputs ? getParameterFromName(nodes[item].nodeInputs as NodeInputs, 'foreach') : undefined;
    const foreachValue =
      operation && (operation as any).foreach
        ? (operation as any).foreach
        : parameter && parameter.value.length === 1 && parameter.value[0].token?.key;
    return equals(operation?.type, Constants.NODE.TYPE.FOREACH) && equals(foreachValue, sanitizedPath);
  }, repetitionNodeIds);

  return !!foreachAction;
};

const getRepetitionReference = async (
  nodeId: string,
  state: OperationMetadataState,
  idReplacements: Record<string, string>
): Promise<RepetitionReference | undefined> => {
  const operationInfo = state.operationInfo[nodeId];
  const service = OperationManifestService();
  if (service.isSupported(operationInfo.type, operationInfo.kind)) {
    const manifest = await getOperationManifest(operationInfo);
    const parameterName = manifest.properties.repetition?.loopParameter;
    const parameter = parameterName ? getParameterFromName(state.inputParameters[nodeId], parameterName) : undefined;
    if (parameter) {
      const repetitionValue = getJSONValueFromString(
        parameterValueToString(parameter, /* isDefinitionValue */ true, idReplacements),
        parameter.type
      );
      return {
        actionName: nodeId,
        actionType: operationInfo.type,
        repetitionValue,
      };
    }
  }

  return undefined;
};

interface Foreach {
  step?: string;
  path?: string;
  fullPath?: string;
}

const parseForeach = (repetitionValue: string, repetitionContext: RepetitionContext): Foreach => {
  const foreach: Foreach = {};

  if (repetitionValue) {
    let foreachExpression: Expression | undefined;
    let splitOnExpression: Expression | undefined;
    try {
      foreachExpression = ExpressionParser.parseTemplateExpression(repetitionValue);
    } catch {
      // for invalid case, we just ignore it and return empty object
    }

    if (repetitionContext.splitOn) {
      try {
        splitOnExpression = ExpressionParser.parseTemplateExpression(repetitionContext.splitOn);
      } catch {
        // for invalid case, we just ignore it
      }
    }

    if (foreachExpression) {
      switch (foreachExpression.type) {
        case ExpressionType.Function:
          // eslint-disable-next-line no-case-declarations
          const functionExpression = foreachExpression as ExpressionFunction;
          if (TokenSegmentConvertor.isOutputToken(functionExpression) || TokenSegmentConvertor.isVariableToken(functionExpression)) {
            foreach.fullPath = getFullPath(functionExpression, splitOnExpression);
            if (functionExpression.dereferences.length > 0) {
              foreach.path = buildSegmentPath(functionExpression.dereferences);
            } else {
              foreach.path = create([OutputKeys.Body]);
            }

            if (functionExpression.arguments.length > 0) {
              const argumentExpression = functionExpression.arguments[0] as ExpressionLiteral;
              foreach.step = argumentExpression.value;
            }
          } else if (TokenSegmentConvertor.isItemToken(functionExpression) || TokenSegmentConvertor.isItemsToken(functionExpression)) {
            let parentRepetitionValue: any;
            let validRepetitionReferences: RepetitionReference[] = [];

            if (TokenSegmentConvertor.isItemToken(functionExpression)) {
              validRepetitionReferences = [...repetitionContext.repetitionReferences];
              validRepetitionReferences.shift();
              parentRepetitionValue = getClosestRepetitionValue(repetitionContext);
            } else {
              const actionExpression = functionExpression.arguments[0] as ExpressionLiteral;
              const parentForeachName = actionExpression.value;
              parentRepetitionValue = getRepetitionValue(repetitionContext, parentForeachName);
              if (parentRepetitionValue) {
                let shouldAdd = false;
                for (const reference of repetitionContext.repetitionReferences) {
                  if (shouldAdd) {
                    validRepetitionReferences.push(reference);
                  }
                  if (equals(reference.actionName, parentForeachName)) {
                    shouldAdd = true;
                  }
                }
              }
            }

            if (typeof parentRepetitionValue === 'string' && isTemplateExpression(parentRepetitionValue)) {
              const parentRepetitionContext: RepetitionContext = {
                splitOn: repetitionContext.splitOn,
                repetitionReferences: validRepetitionReferences,
              };

              const parentForeach = parseForeach(parentRepetitionValue, parentRepetitionContext);
              const parentSegments = parseEx(parentForeach.fullPath);
              for (const item of functionExpression.dereferences) {
                const literalExpression = item.expression as ExpressionLiteral;
                parentSegments.push({
                  type: SegmentType.Property,
                  value: literalExpression.value,
                });
              }

              foreach.step = parentForeach.step;
              foreach.path = buildSegmentPath(functionExpression.dereferences);
              foreach.fullPath = createEx(parentSegments);
            }
          }
          break;
        default:
          break;
      }
    }
  }

  return foreach;
};

const getClosestRepetitionValue = (repetitionContext: RepetitionContext): any => {
  return repetitionContext?.repetitionReferences?.at(0)?.repetitionValue;
};

const getRepetitionValue = (repetitionContext: RepetitionContext, actionName?: string): any => {
  return getRepetitionReferenceFromContext(repetitionContext, actionName)?.repetitionValue;
};

const getRepetitionReferenceFromContext = (repetitionContext: RepetitionContext, actionName?: string): RepetitionReference | undefined => {
  if (actionName) {
    return first((item) => equals(item.actionName, actionName), repetitionContext.repetitionReferences);
  } else {
    return repetitionContext?.repetitionReferences?.at(0);
  }
};

const isExpressionEqualToNodeSplitOn = (test: string | any[], splitOn: string | undefined): boolean => {
  if (typeof test !== 'string') {
    return false;
  }

  if (splitOn === undefined || test === undefined) {
    return false;
  }

  if (equals(test, splitOn)) {
    return true;
  }

  return false;
};

export const getTokenExpressionValueForManifestBasedOperation = (
  key: string,
  isInsideArray: boolean,
  loopSource: string | undefined,
  actionName: string | undefined,
  required: boolean
): string => {
  // TODO: This might require update for Open API for aliasing support.
  const method = isInsideArray
    ? loopSource
      ? `items(${convertToStringLiteral(loopSource)})`
      : Constants.ITEM
    : actionName
    ? `${Constants.OUTPUTS}(${convertToStringLiteral(actionName)})`
    : Constants.TRIGGER_OUTPUTS_OUTPUT;

  return generateExpressionFromKey(method, key, actionName, isInsideArray, required);
};
/**
 * generate the full path for the specifiecd expression segments, e.g, for @body('action')?[test] => body.$.test
 * if the splitOn is not empty, and the expression is triggerBody(), then it would also append the splitOn path,
 * e.g, @triggerBody()?[attachements] with splitOn: @triggerBody()['value'], the result would be: body.$.value.attachments
 */
const getFullPath = (expressionSegment: ExpressionFunction, splitOn?: Expression): string => {
  const segments = ['body', '$'];

  // handle the splitOn first
  // TODO: log the issue if splitOn is not functionExpression
  if (equals(expressionSegment.name, 'triggerbody') && !!splitOn) {
    if (isFunction(splitOn)) {
      if (equals(splitOn.name, expressionSegment.name)) {
        for (const dereference of splitOn.dereferences) {
          if (isStringLiteral(dereference.expression)) {
            segments.push(dereference.expression.value);
          }
        }
      }
    }
  }

  // TODO: log the issue if expression is not string
  for (const dereference of expressionSegment.dereferences) {
    if (isStringLiteral(dereference.expression)) {
      segments.push(dereference.expression.value);
    }
  }

  return create(segments) as string;
};

const buildSegmentPath = (dereferences: Dereference[]): string => {
  return dereferences.map((dereference) => `['${(dereference.expression as ExpressionLiteral).value}']`).join('');
};

export const getParentArrayKey = (key: string): string | undefined => {
  const segments = parseEx(key);
  if (segments.length > 1) {
    for (let index = segments.length - 1; index >= 0; index--) {
      if (segments[index].type === SegmentType.Index) {
        return createEx(segments.slice(0, index));
      }
    }
  }

  return undefined;
};

const sanitizeKey = (original: string): string => {
  if (original) {
    if (containsWildIndexSegment(original)) {
      const segments = parseEx(original);
      const sanitizedSegments: Segment[] = [];
      for (const segment of segments) {
        if (segment.type !== SegmentType.Index) {
          sanitizedSegments.push(segment);
        }
      }
      return createEx(sanitizedSegments) as string;
    }
  }

  return original;
};

const getExtraSegments = (key: string, ancestorKey: string | undefined): Segment[] => {
  let childSegments: Segment[] = [];
  let startIndex = 0;

  if (key && ancestorKey) {
    childSegments = parseEx(key);
    const ancestorSegments = parseEx(ancestorKey);
    let ancestorStartIndex = 0;
    if (ancestorSegments.length < childSegments.length) {
      for (startIndex = 0; startIndex < childSegments.length; startIndex++) {
        const childSegment = childSegments[startIndex];
        const ancestorSegment = ancestorSegments[ancestorStartIndex];
        if (childSegment.type === SegmentType.Property && childSegment.value === ancestorSegment.value) {
          ancestorStartIndex++;
        }
        if (ancestorStartIndex === ancestorSegments.length) {
          startIndex++;
          break;
        }
      }
    }
  }

  return childSegments.slice(startIndex);
};

// NOTE: The implicit addition of Foreach node was governed by adding a token, so we will be only using that
// tokenOwnerNodeId to populate the info. This method should only be used for Implicit Foreach node addition.
const updateTokenMetadataInForeachInputs = (inputs: NodeInputs, token: OutputToken, rootState: RootState): void => {
  const allParameters = getAllInputParameters(inputs);
  const triggerNodeId = getTriggerNodeId(rootState.workflow);
  const tokenOwnerNodeId = token.outputInfo.actionName ?? triggerNodeId;
  const actionNodes = { [tokenOwnerNodeId]: tokenOwnerNodeId };
  const nodesData = {
    [tokenOwnerNodeId]: {
      settings: rootState.operations.settings[tokenOwnerNodeId],
      nodeOutputs: rootState.operations.outputParameters[tokenOwnerNodeId],
      operationMetadata: { brandColor: token.brandColor, iconUri: token.icon },
    },
  } as Record<string, NodeDataWithOperationMetadata>;
  for (const parameter of allParameters) {
    const segments = parameter.value;

    if (segments && segments.length) {
      parameter.value = segments.map((segment) => {
        if (isTokenValueSegment(segment)) {
          return updateTokenMetadata(
            segment,
            actionNodes,
            triggerNodeId,
            nodesData,
            { [tokenOwnerNodeId]: rootState.workflow.operations[tokenOwnerNodeId] },
            rootState.workflowParameters.definitions,
            rootState.workflow.nodesMetadata,
            parameter.type
          );
        }

        return segment;
      });
    }
  }
};
