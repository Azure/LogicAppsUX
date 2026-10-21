import { GraphContainer, WorkflowPreview } from '@microsoft/designer-ui';
import type { WorkflowPreviewGraph, WorkflowPreviewProps } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES, type SubgraphType } from '@microsoft/logic-apps-shared';
import { BezierEdge, useReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react';
import { useMemo } from 'react';
import { ActionCard } from './CustomNodes/components/card/actionCard';
import { SubgraphCard } from './CustomNodes/components/card/subgraphCard';
import { DefaultHandle } from './CustomNodes/components/handles/DefaultHandle';
import HiddenNode from './CustomNodes/HiddenNode';
import HiddenEdge from './connections/hiddenEdge';
import { filterRunAfters, WorkflowEdgeView } from './connections/workflowEdgeView';
import { ReadOnlyHandoffEdge } from './connections/handoffEdgeView';
import type { WorkflowNode } from '../core/parsers/models/workflowNode';
import { useReadOnlyGraphLayout, type ReadOnlyLayoutState } from './useReadOnlyGraphLayout';

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  label: string;
  iconUri?: string;
  brandColor?: string;
  subgraphType?: SubgraphType;
  graphId?: string;
  comment?: string;
  isSecureInputsOutputs?: boolean;
  staticResultsEnabled?: boolean;
}

export interface WorkflowGraphEdgeData extends Record<string, unknown> {
  runAfter?: Record<string, string[]>;
}

export interface ReadOnlyWorkflowGraphData {
  nodes: Node<WorkflowGraphNodeData>[];
  edges: Edge<WorkflowGraphEdgeData>[];
  layoutSource?: WorkflowNode;
}

const Operation = ({ id, data, type }: NodeProps<Node<WorkflowGraphNodeData>>) => (
  <div>
    <DefaultHandle type="target" />
    <ActionCard
      id={`preview-${id}`}
      title={data.label}
      icon={data.iconUri}
      brandColor={data.brandColor}
      isScope={type === 'SCOPE_CARD_NODE'}
      inert
      readOnly
      comment={data.comment}
      isSecureInputsOutputs={data.isSecureInputsOutputs}
      staticResultsEnabled={data.staticResultsEnabled}
    />
    <DefaultHandle type="source" />
  </div>
);

const Subgraph = ({ id, data }: NodeProps<Node<WorkflowGraphNodeData>>) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ position: 'relative' }}>
      <DefaultHandle type="target" />
      {data.subgraphType ? (
        <SubgraphCard
          id={`preview-${id}`}
          parentId={data.graphId ?? ''}
          title={data.label}
          subgraphType={data.subgraphType}
          readOnly
          inert
        />
      ) : null}
      <DefaultHandle type="source" />
    </div>
  </div>
);

const Container = ({ id, data, width, height, type }: NodeProps<Node<WorkflowGraphNodeData>>) => (
  <div
    className={`msla-graph-container-wrapper${type === 'SUBGRAPH_NODE' ? ' is-subgraph' : ''}${data.subgraphType === SUBGRAPH_TYPES.UNTIL_DO ? ' has-footer' : ''}`}
    style={{ width, height }}
    role="group"
    aria-label={data.label}
  >
    <DefaultHandle type="target" />
    <GraphContainer id={`preview-${id}`} />
    <DefaultHandle type="source" />
  </div>
);

const Connection = (props: EdgeProps<Edge<WorkflowGraphEdgeData>>) => {
  const { getNode } = useReactFlow();
  const filteredRunAfters = useMemo(() => filterRunAfters(props.data?.runAfter), [props.data?.runAfter]);
  const index = Object.keys(filteredRunAfters)
    .sort((a, b) => (getNode(b)?.position.x ?? 0) - (getNode(a)?.position.x ?? 0))
    .indexOf(props.source);
  return <WorkflowEdgeView {...props} filteredRunAfters={filteredRunAfters} runAfterIndex={index} />;
};

const nodeTypes: WorkflowPreviewGraph['nodeTypes'] = {
  OPERATION_NODE: Operation,
  SCOPE_CARD_NODE: Operation,
  SUBGRAPH_CARD_NODE: Subgraph,
  GRAPH_NODE: Container,
  SUBGRAPH_NODE: Container,
  HIDDEN_NODE: HiddenNode,
};
const edgeTypes: WorkflowPreviewGraph['edgeTypes'] = {
  BUTTON_EDGE: Connection,
  HEADING_EDGE: Connection,
  ONLY_EDGE: BezierEdge,
  HIDDEN_EDGE: HiddenEdge,
  HANDOFF_EDGE: ReadOnlyHandoffEdge,
};

/** Native Designer leaves in an isolated navigation-only viewport. Never mounts editor providers or controllers. */
export const ReadOnlyWorkflowGraph = ({
  graph,
  onLayoutStateChange,
  ...props
}: Pick<WorkflowPreviewProps, 'ariaLabel' | 'className'> & {
  graph: ReadOnlyWorkflowGraphData;
  onLayoutStateChange?: (state: ReadOnlyLayoutState) => void;
}) => {
  const { view, onNodeSizesChange } = useReadOnlyGraphLayout(graph, onLayoutStateChange);
  const presentation = useMemo(
    () => ({
      nodes: view.nodes.map((node) =>
        node.type === 'GRAPH_NODE' || node.type === 'SUBGRAPH_NODE' ? node : { ...node, height: undefined }
      ),
      edges: view.edges,
      nodeTypes,
      edgeTypes,
      onNodeSizesChange,
    }),
    [view, onNodeSizesChange]
  );
  return <WorkflowPreview {...props} graph={presentation} />;
};
