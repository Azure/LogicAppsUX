import {
  WORKFLOW_PREVIEW_NODE_HEIGHT,
  WORKFLOW_PREVIEW_NODE_WIDTH,
  type WorkflowPreviewNode,
  type WorkflowPreviewProps,
} from '@microsoft/designer-ui';
import {
  agentOperation,
  composeOperation,
  foreachOperation,
  getIntl,
  getRecordEntry,
  ifOperation,
  labelCase,
  removeIdTag,
  requestOperation,
  responseOperation,
  scopeOperation,
  SUBGRAPH_TYPES,
  switchOperation,
  untilOperation,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_TYPES,
} from '@microsoft/logic-apps-shared';
import type { SubgraphType } from '@microsoft/logic-apps-shared';
import type { WorkflowExtractionPlan } from '../../../common/models/workflowExtraction';
import { layoutWorkflowGraph } from '../../../core/graphlayout/elklayout';
import { buildGraphFromActions, getAllActionNames } from '../../../core/parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { createWorkflowEdge, createWorkflowNode } from '../../../core/utils/graph';

export type WorkflowExtractionPreviewVisuals = Readonly<Record<string, Pick<WorkflowPreviewNode, 'iconUri' | 'brandColor'>>>;

const operationVisuals: WorkflowExtractionPreviewVisuals = {
  compose: composeOperation.properties,
  request: requestOperation.properties,
  response: responseOperation.properties,
  if: ifOperation.properties,
  switch: switchOperation.properties,
  scope: scopeOperation.properties,
  foreach: foreachOperation.properties,
  until: untilOperation.properties,
  agent: agentOperation.properties,
};

const branchTypes: Partial<Record<SubgraphType, WorkflowPreviewNode['branchType']>> = {
  [SUBGRAPH_TYPES.CONDITIONAL_TRUE]: 'true',
  [SUBGRAPH_TYPES.CONDITIONAL_FALSE]: 'false',
  [SUBGRAPH_TYPES.SWITCH_CASE]: 'case',
  [SUBGRAPH_TYPES.SWITCH_DEFAULT]: 'default',
  [SUBGRAPH_TYPES.AGENT_CONDITION]: 'tool',
  [SUBGRAPH_TYPES.UNTIL_DO]: 'do',
};

const branchLabel = (type: WorkflowPreviewNode['branchType'], id: string): string => {
  const intl = getIntl();
  switch (type) {
    case 'true':
      return intl.formatMessage({ defaultMessage: 'True', id: '/WW7If', description: 'True' });
    case 'false':
      return intl.formatMessage({ defaultMessage: 'False', id: 'PXa0D4', description: 'False' });
    case 'default':
      return intl.formatMessage({ defaultMessage: 'Default', id: 'FUuFlC', description: 'Default, the backup option if none other apply' });
    case 'do':
      return intl.formatMessage({ defaultMessage: 'Do', id: 'c/+j08', description: 'Do, as in "to do an action"' });
    default:
      return labelCase(id);
  }
};

export const getWorkflowExtractionPreview = async (
  plan: WorkflowExtractionPlan,
  sourceVisuals: WorkflowExtractionPreviewVisuals = {}
): Promise<Pick<WorkflowPreviewProps, 'nodes' | 'edges'>> => {
  const triggers = plan.child.definition.triggers ?? {};
  const actions = plan.child.definition.actions ?? {};
  const triggerIds = Object.keys(triggers);
  // Use the real container parser without Deserialize's host logging/initialization effects.
  const [children, actionEdges, operations, metadata] = buildGraphFromActions(
    actions,
    'root',
    undefined,
    [...getAllActionNames(actions), ...triggerIds],
    false
  );
  const graph: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [...triggerIds.map((id) => createWorkflowNode(id)), ...children],
    edges: [
      ...Object.entries(actions).flatMap(([id, action]) =>
        Object.keys(action.runAfter ?? {}).length ? [] : triggerIds.map((triggerId) => createWorkflowEdge(triggerId, id))
      ),
      ...actionEdges,
    ],
  };
  const selectedActions = Object.fromEntries(plan.selectedIds.filter((id) => Object.hasOwn(actions, id)).map((id) => [id, actions[id]]));
  const sourceIds = new Set(getAllActionNames(selectedActions, [], true));
  const graphNodes = new Map<string, WorkflowNode>();
  const sizeNodes = (node: WorkflowNode) => {
    graphNodes.set(node.id, node);
    if (node.children) {
      node.children.forEach(sizeNodes);
    } else {
      node.width = WORKFLOW_PREVIEW_NODE_WIDTH;
      node.height = WORKFLOW_PREVIEW_NODE_HEIGHT;
    }
  };
  sizeNodes(graph);
  const [layoutNodes, layoutEdges] = await layoutWorkflowGraph(graph, true);

  return {
    nodes: layoutNodes.map(({ id, position, parentId, data }) => {
      const node = graphNodes.get(id)!;
      const baseId = removeIdTag(id);
      const operation = getRecordEntry(triggers, baseId) ?? getRecordEntry(operations, baseId);
      const subgraphType = getRecordEntry(metadata, baseId)?.subgraphType;
      const branchType = subgraphType ? branchTypes[subgraphType] : undefined;
      const container = node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE || node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE;
      const branch = node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE;
      const visuals =
        (sourceIds.has(baseId) ? getRecordEntry(sourceVisuals, baseId) : undefined) ??
        (operation ? operationVisuals[operation.type.toLowerCase()] : undefined);
      return {
        id,
        label: branch ? branchLabel(branchType, baseId) : labelCase(baseId),
        position,
        parentId,
        width: data.size?.width ?? node.width,
        height: data.size?.height ?? node.height,
        ...(container
          ? { kind: 'container' as const }
          : branch
            ? { kind: 'branch' as const, branchType }
            : node.type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE
              ? { kind: 'scope' as const }
              : {}),
        iconUri: visuals?.iconUri,
        brandColor: visuals?.brandColor,
      };
    }),
    edges: layoutEdges
      .filter((edge) => edge.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE)
      .map(({ id, source, target }) => ({ id, source, target })),
  };
};
