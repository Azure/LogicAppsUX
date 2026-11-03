import {
  agentOperation,
  composeOperation,
  foreachOperation,
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
  WORKFLOW_NODE_TYPES,
} from '@microsoft/logic-apps-shared';
import type { WorkflowExtractionPlan } from '../../../common/models/workflowExtraction';
import { layoutWorkflowGraph } from '../../../core/graphlayout/elklayout';
import { adjustHandoffGraph } from '../../../core/graphlayout/handoffGraph';
import { buildGraphFromActions, getAllActionNames } from '../../../core/parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { createWorkflowEdge, createWorkflowNode } from '../../../core/utils/graph';
import type { ReadOnlyWorkflowGraphData, WorkflowGraphNodeData } from '../../ReadOnlyWorkflowGraph';

export type WorkflowExtractionPreviewVisuals = Readonly<Record<string, Pick<WorkflowGraphNodeData, 'iconUri' | 'brandColor'>>>;

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

export const getWorkflowExtractionPreview = async (
  plan: WorkflowExtractionPlan,
  sourceVisuals: WorkflowExtractionPreviewVisuals = {}
): Promise<ReadOnlyWorkflowGraphData> => {
  // Own all parser/layout input and presentation data; no live state or service initialization is involved.
  const triggers = structuredClone(plan.child.definition.triggers ?? {});
  const actions = structuredClone(plan.child.definition.actions ?? {});
  const triggerIds = Object.keys(triggers);
  const [children, actionEdges, operations, metadata] = buildGraphFromActions(
    actions,
    'root',
    undefined,
    [...getAllActionNames(actions), ...triggerIds],
    false
  );
  const graph = adjustHandoffGraph(
    {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [...triggerIds.map((id) => createWorkflowNode(id)), ...children],
      edges: [
        ...Object.entries(actions).flatMap(([id, action]) =>
          Object.keys(action.runAfter ?? {}).length ? [] : triggerIds.map((triggerId) => createWorkflowEdge(triggerId, id))
        ),
        ...actionEdges,
      ],
    },
    operations,
    (id) => {
      const operation = getRecordEntry(operations, id);
      const target = operation && 'inputs' in operation ? (operation.inputs as { name?: unknown } | undefined)?.name : undefined;
      return typeof target === 'string' ? target : '';
    }
  );
  const selectedActions = Object.fromEntries(plan.selectedIds.filter((id) => Object.hasOwn(actions, id)).map((id) => [id, actions[id]]));
  const sourceIds = new Set(getAllActionNames(selectedActions, [], true));
  const graphNodes = new Map<string, WorkflowNode>();
  const sizeNodes = (node: WorkflowNode) => {
    graphNodes.set(node.id, node);
    if (node.children?.length) {
      node.children.forEach(sizeNodes);
    } else {
      const subgraphType = getRecordEntry(metadata, removeIdTag(node.id))?.subgraphType;
      const smallBranch =
        node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE &&
        subgraphType !== SUBGRAPH_TYPES.SWITCH_CASE &&
        subgraphType !== SUBGRAPH_TYPES.AGENT_CONDITION;
      node.width = smallBranch ? 120 : 200;
      node.height = smallBranch ? 32 : subgraphType === SUBGRAPH_TYPES.SWITCH_CASE ? 40 : 44;
    }
  };
  sizeNodes(graph);
  const [layoutNodes, layoutEdges] = await layoutWorkflowGraph(graph, true);
  const containerCount = layoutNodes.filter(
    ({ type }) => type === WORKFLOW_NODE_TYPES.GRAPH_NODE || type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE
  ).length;
  return {
    layoutSource: graph,
    nodes: layoutNodes.map(({ id, type, position, parentId, data }) => {
      const node = graphNodes.get(id)!;
      const baseId = removeIdTag(id);
      const operation = getRecordEntry(triggers, baseId) ?? getRecordEntry(operations, baseId);
      const nodeMetadata = getRecordEntry(metadata, baseId);
      const container = type === WORKFLOW_NODE_TYPES.GRAPH_NODE || type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE;
      const visuals =
        (sourceIds.has(baseId) ? getRecordEntry(sourceVisuals, baseId) : undefined) ??
        (operation ? operationVisuals[operation.type.toLowerCase()] : undefined);
      return {
        id,
        type,
        position,
        parentId,
        width: data.size?.width ?? node.width,
        height: data.size?.height ?? node.height,
        // Place native edges above nested backgrounds but below card/header content.
        zIndex: container ? 0 : containerCount + 2,
        data: {
          label: labelCase(baseId),
          iconUri: visuals?.iconUri,
          brandColor: visuals?.brandColor,
          subgraphType: nodeMetadata?.subgraphType,
          graphId: nodeMetadata?.graphId,
          comment: operation?.description,
          isSecureInputsOutputs: !!operation?.runtimeConfiguration?.secureData?.properties?.length,
          staticResultsEnabled: operation?.runtimeConfiguration?.staticResult?.staticResultOptions === 'Enabled',
        },
      };
    }),
    edges: layoutEdges.map((edge) => ({
      ...edge,
      zIndex: containerCount + 1,
      data: {
        ...edge.data,
        runAfter: (getRecordEntry(operations, removeIdTag(edge.target)) as { runAfter?: Record<string, string[]> } | undefined)?.runAfter,
      },
    })),
  };
};
