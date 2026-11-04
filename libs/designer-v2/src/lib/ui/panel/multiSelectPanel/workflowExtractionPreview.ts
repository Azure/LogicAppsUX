import { WORKFLOW_PREVIEW_NODE_HEIGHT, type WorkflowPreviewNode, type WorkflowPreviewProps } from '@microsoft/designer-ui';
import { composeOperation, labelCase, requestOperation, responseOperation, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { WorkflowExtractionPlan } from '../../../common/models/workflowExtraction';
import type { NodeOperation } from '../../../core/state/operation/operationMetadataSlice';

export type WorkflowExtractionPreviewVisuals = Readonly<
  Record<string, Pick<WorkflowPreviewNode, 'iconUri' | 'brandColor'> & { operationInfo?: NodeOperation }>
>;

export interface SharedExtractionPreviewNode extends WorkflowPreviewNode {
  operation: LogicAppsV2.OperationDefinition;
  operationInfo?: NodeOperation;
  isTrigger: boolean;
}

export const getSharedWorkflowExtractionPreview = (
  plan: WorkflowExtractionPlan,
  graph: Pick<WorkflowPreviewProps, 'nodes' | 'edges'>,
  sourceVisuals: WorkflowExtractionPreviewVisuals = {}
): { nodes: SharedExtractionPreviewNode[]; edges: WorkflowPreviewProps['edges'] } => ({
  ...graph,
  nodes: graph.nodes.map((node) => {
    const triggers = plan.child.definition.triggers ?? {};
    const actions = plan.child.definition.actions ?? {};
    const isTrigger = Object.prototype.hasOwnProperty.call(triggers, node.id);
    const operation = isTrigger ? triggers[node.id] : actions[node.id];
    const sourceInfo = plan.selectedIds.includes(node.id) ? sourceVisuals[node.id]?.operationInfo : undefined;
    return {
      ...node,
      operation,
      isTrigger,
      operationInfo: sourceInfo ? { ...sourceInfo, type: operation.type, kind: operation.kind } : undefined,
    };
  }),
});

const operationVisuals: WorkflowExtractionPreviewVisuals = {
  compose: composeOperation.properties,
  request: requestOperation.properties,
  response: responseOperation.properties,
};

export const getWorkflowExtractionPreview = (
  plan: WorkflowExtractionPlan,
  sourceVisuals: WorkflowExtractionPreviewVisuals = {}
): Pick<WorkflowPreviewProps, 'nodes' | 'edges'> => {
  const triggers = plan.child.definition.triggers ?? {};
  const actions = plan.child.definition.actions ?? {};
  const triggerIds = Object.keys(triggers);
  const orderedIds = [...triggerIds, ...plan.selectedIds, ...Object.keys(actions).filter((id) => !plan.selectedIds.includes(id))];

  return {
    nodes: orderedIds.map((id, index) => {
      const operation = Object.prototype.hasOwnProperty.call(triggers, id) ? triggers[id] : actions[id];
      const visuals = (plan.selectedIds.includes(id) ? sourceVisuals[id] : undefined) ?? operationVisuals[operation.type.toLowerCase()];
      return {
        id,
        label: labelCase(id),
        position: { x: 0, y: index * (WORKFLOW_PREVIEW_NODE_HEIGHT + 40) },
        iconUri: visuals?.iconUri,
        brandColor: visuals?.brandColor,
      };
    }),
    edges: Object.entries(actions).flatMap(([id, action]) => {
      const predecessors = Object.keys(action.runAfter ?? {});
      return (predecessors.length ? predecessors : triggerIds).map((parent) => ({
        id: JSON.stringify([parent, id]),
        source: parent,
        target: id,
      }));
    }),
  };
};
