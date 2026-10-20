import { clone, getIntl, isScopeOperation } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '../../common/models/workflow';
import type { CopiedConnectionData } from '../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../state/tokens/tokensSlice';
import { getReferenceNameReplacement, remapConnectionExpression } from './connectors/connectionExpression';

export interface ActionClipboardEntry {
  nodeId: string;
  isScopeNode: false;
  nodeData: Omit<NodeData, 'id'>;
  nodeOperationInfo: NodeOperation;
  nodeTokenData?: NodeTokens;
  nodeConnectionData?: ConnectionMapping[string];
  nodeComment?: string;
  sourceNodeId?: string;
}

export interface ScopeClipboardEntry {
  nodeId: string;
  isScopeNode: true;
  serializedOperation: LogicAppsV2.ActionDefinition;
  allConnectionData: Record<string, CopiedConnectionData>;
  staticResults: Record<string, unknown>;
  sourceNodeId?: string;
}

export type ClipboardEntry = ActionClipboardEntry | ScopeClipboardEntry;
export interface ClipboardEdge {
  source: string;
  target: string;
  statuses?: string[];
}

export const clipboardError = (source = false) => {
  const intl = getIntl();
  return new Error(
    source
      ? intl.formatMessage({
          defaultMessage: 'The selected actions are not ready to copy. Wait for their details to load, then try again.',
          id: 'sCWFvn',
          description: 'Error when copying actions whose source configuration is not loaded',
        })
      : intl.formatMessage({
          defaultMessage: 'The clipboard does not contain complete action data. Copy the actions again after their details have loaded.',
          id: 'uv0ghT',
          description: 'Error when pasting incomplete or invalid action clipboard data',
        })
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const remapClipboardNodeData = (data: Omit<NodeData, 'id'>, replacements: Record<string, string>): Omit<NodeData, 'id'> => {
  const result = clone(data);
  const parameters = new Set<unknown>([
    ...Object.values(result.nodeInputs.parameterGroups).flatMap((group) => group.parameters),
    ...(result.nodeInputs.stashedDynamicParameterValues ?? []),
  ]);
  const visit = (value: unknown, editorValues = false): void => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        if (typeof value[index] === 'string') {
          value[index] = remapConnectionExpression(value[index], replacements);
        } else {
          visit(value[index], editorValues);
        }
      }
    } else if (isRecord(value)) {
      if (editorValues && value.type === 'literal' && typeof value.id === 'string' && typeof value.value === 'string') {
        return;
      }
      if (editorValues && value.type === 'token' && typeof value.value === 'string' && isRecord(value.token)) {
        const prefixed = !value.value.startsWith('@');
        const expression = remapConnectionExpression(prefixed ? `@${value.value}` : value.value, replacements);
        value.value = prefixed ? expression.slice(1) : expression;
        value.token.value = value.value;
        const token = value.token;
        if (typeof token.actionName === 'string') {
          token.actionName = getReferenceNameReplacement(replacements, token.actionName) ?? token.actionName;
        }
        if (isRecord(token.arrayDetails) && typeof token.arrayDetails.loopSource === 'string') {
          token.arrayDetails.loopSource =
            getReferenceNameReplacement(replacements, token.arrayDetails.loopSource) ?? token.arrayDetails.loopSource;
        }
      } else {
        for (const [key, child] of Object.entries(value)) {
          if (typeof child === 'string') {
            value[key] = remapConnectionExpression(child, replacements);
          } else {
            visit(child, editorValues || (parameters.has(value) && (key === 'value' || key === 'editorViewModel')));
          }
        }
      }
    }
  };
  visit(result);
  return result;
};

const isParameter = (parameter: unknown): boolean =>
  isRecord(parameter) &&
  ['id', 'parameterKey', 'parameterName', 'type'].every((key) => typeof parameter[key] === 'string') &&
  isRecord(parameter.info) &&
  Array.isArray(parameter.value) &&
  parameter.value.every(
    (segment) =>
      isRecord(segment) &&
      typeof segment.id === 'string' &&
      typeof segment.value === 'string' &&
      (segment.type === 'literal' || segment.type === 'token') &&
      (segment.token === undefined || (isRecord(segment.token) && typeof segment.token.tokenType === 'string'))
  );

export const hasCompleteActionData = (value: unknown): value is Omit<NodeData, 'id'> => {
  if (!isRecord(value)) {
    return false;
  }
  const { nodeInputs, nodeOutputs, nodeDependencies, operationMetadata } = value;
  return (
    isRecord(nodeInputs) &&
    isRecord(nodeInputs.parameterGroups) &&
    Object.values(nodeInputs.parameterGroups).every(
      (group) =>
        isRecord(group) &&
        typeof group.id === 'string' &&
        Array.isArray(group.parameters) &&
        group.parameters.every(isParameter) &&
        Array.isArray(group.rawInputs) &&
        group.rawInputs.every(isRecord)
    ) &&
    isRecord(nodeOutputs) &&
    isRecord(nodeOutputs.outputs) &&
    Object.values(nodeOutputs.outputs).every(isRecord) &&
    isRecord(nodeDependencies) &&
    isRecord(nodeDependencies.inputs) &&
    isRecord(nodeDependencies.outputs) &&
    isRecord(operationMetadata) &&
    typeof operationMetadata.iconUri === 'string' &&
    typeof operationMetadata.brandColor === 'string' &&
    (value.settings === undefined || isRecord(value.settings)) &&
    (value.actionMetadata === undefined || isRecord(value.actionMetadata))
  );
};

const isActionDefinition = (value: unknown): value is LogicAppsV2.ActionDefinition => {
  if (!isRecord(value) || typeof value.type !== 'string' || !value.type) {
    return false;
  }
  if (
    value.runAfter !== undefined &&
    (!isRecord(value.runAfter) ||
      !Object.values(value.runAfter).every((statuses) => Array.isArray(statuses) && statuses.every((status) => typeof status === 'string')))
  ) {
    return false;
  }
  const validActions = (actions: unknown): boolean =>
    isRecord(actions) && Object.values(actions).every((action) => isActionDefinition(action));
  if (value.actions !== undefined && !validActions(value.actions)) {
    return false;
  }
  for (const branch of ['else', 'default']) {
    const branchValue = value[branch];
    if (branchValue !== undefined && (!isRecord(branchValue) || !validActions(branchValue.actions))) {
      return false;
    }
  }
  return (
    value.cases === undefined ||
    (isRecord(value.cases) && Object.values(value.cases).every((branch) => isRecord(branch) && validActions(branch.actions)))
  );
};

const isConnectionMapping = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  typeof value === 'string' ||
  (isRecord(value) &&
    value.kind === 'expression' &&
    typeof value.expression === 'string' &&
    (value.designTimeReferenceKey === undefined || typeof value.designTimeReferenceKey === 'string'));

export const isClipboardEntry = (value: unknown): value is ClipboardEntry => {
  if (!isRecord(value) || typeof value.nodeId !== 'string' || !value.nodeId) {
    return false;
  }
  if (value.sourceNodeId !== undefined && typeof value.sourceNodeId !== 'string') {
    return false;
  }
  if (value.isScopeNode === true) {
    return (
      isActionDefinition(value.serializedOperation) &&
      isScopeOperation(value.serializedOperation.type) &&
      isRecord(value.allConnectionData) &&
      Object.values(value.allConnectionData).every((data) => isRecord(data) && isConnectionMapping(data.mapping)) &&
      isRecord(value.staticResults)
    );
  }
  const info = value.nodeOperationInfo;
  return (
    value.isScopeNode === false &&
    hasCompleteActionData(value.nodeData) &&
    isRecord(info) &&
    typeof info.type === 'string' &&
    !!info.type &&
    !isScopeOperation(info.type) &&
    typeof info.connectorId === 'string' &&
    typeof info.operationId === 'string' &&
    isConnectionMapping(value.nodeConnectionData) &&
    (value.nodeTokenData === undefined ||
      (isRecord(value.nodeTokenData) &&
        Array.isArray(value.nodeTokenData.tokens) &&
        value.nodeTokenData.tokens.every((token) => isRecord(token) && isRecord(token.outputInfo)) &&
        Array.isArray(value.nodeTokenData.upstreamNodeIds))) &&
    (value.nodeComment === undefined || typeof value.nodeComment === 'string')
  );
};

export const validateClipboard = (value: unknown): { nodes: ClipboardEntry[]; edges: ClipboardEdge[] } => {
  if (!isRecord(value) || value.mslaNode !== true) {
    throw clipboardError();
  }
  const nodes = value.isMultiNode === true ? value.nodes : [value];
  const edges = value.isMultiNode === true ? (value.edges ?? []) : [];
  if (!Array.isArray(nodes) || !nodes.length || !nodes.every(isClipboardEntry) || !Array.isArray(edges)) {
    throw clipboardError();
  }
  const ids = new Set(nodes.map((node) => node.nodeId));
  if (
    ids.size !== nodes.length ||
    !edges.every(
      (edge): edge is ClipboardEdge =>
        isRecord(edge) &&
        typeof edge.source === 'string' &&
        typeof edge.target === 'string' &&
        ids.has(edge.source) &&
        ids.has(edge.target) &&
        edge.source !== edge.target &&
        (edge.statuses === undefined || (Array.isArray(edge.statuses) && edge.statuses.every((status) => typeof status === 'string')))
    ) ||
    new Set(edges.map((edge) => `${edge.source}\0${edge.target}`)).size !== edges.length
  ) {
    throw clipboardError();
  }
  const ordered: ClipboardEntry[] = [];
  const remaining = new Set(ids);
  while (remaining.size) {
    const next = nodes.find(
      (node) => remaining.has(node.nodeId) && !edges.some((edge) => edge.target === node.nodeId && remaining.has(edge.source))
    );
    if (!next) {
      throw clipboardError();
    }
    ordered.push(next);
    remaining.delete(next.nodeId);
  }
  return { nodes: ordered, edges };
};
