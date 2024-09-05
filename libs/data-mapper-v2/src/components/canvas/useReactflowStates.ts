import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { applyEdgeChanges, type EdgeChange, useEdges, type Edge, type Node } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { convertWholeDataMapToLayoutTree, isSourceNode, isTargetNode } from '../../utils/ReactFlow.Util';
import { createEdgeId, createTemporaryEdgeId, splitEdgeId } from '../../utils/Edge.Utils';
import { getFunctionNode } from '../../utils/Function.Utils';

type ReactFlowStatesProps = {};

const useReactFlowStates = (_props: ReactFlowStatesProps) => {
  const edges = useEdges();
  const [functionNodesForDragDrop, setFunctionNodesForDragDrop] = useState<Node[]>([]);
  const {
    sourceNodesMap,
    targetNodesMap,
    functionNodes,
    flattenedSourceSchema,
    flattenedTargetSchema,
    dataMapConnections,
    intermediateEdgeMappingForCollapsing,
    nodesForScroll,
    intermediateEdgeMappingForScrolling,
  } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const directEdges: Edge[] = useMemo(() => {
    let edges: Edge[] = [];
    if (Object.entries(dataMapConnections).length > 0) {
      const layout = convertWholeDataMapToLayoutTree(flattenedSourceSchema, flattenedTargetSchema, functionNodes, dataMapConnections);
      edges = layout.edges.map((edge) => {
        const newEdge: Edge = {
          id: createEdgeId(edge.sourceId, edge.targetId),
          source: edge.sourceId,
          target: edge.targetId,
          type: edge.isRepeating ? 'loopEdge' : 'connectedEdge',
          reconnectable: 'target',
          zIndex: 150,
          interactionWidth: 10,
          data: { isRepeating: edge.isRepeating },
          focusable: true,
          deletable: true,
          selectable: true,
        };
        return newEdge;
      });
    }

    return edges;
  }, [dataMapConnections, flattenedSourceSchema, flattenedTargetSchema, functionNodes]);

  const createAndGetIntermediateEdge = useCallback((id: string, sourceId: string, targetId: string, data?: Record<string, any>): Edge => {
    return {
      id: id,
      source: sourceId,
      target: targetId,
      type: 'intermediateConnectedEdge',
      reconnectable: 'target',
      focusable: true,
      interactionWidth: 10,
      deletable: true,
      selectable: true,
      zIndex: 150,
      data: {
        isIntermediate: true,
        ...(data ?? {}),
      },
    };
  }, []);

  // Edges created when node is expanded/Collapsed
  const intermediateEdgesMapForCollapsedNodes: Record<string, Edge> = useMemo(() => {
    const newEdgesMap: Record<string, Edge> = {};
    const entries = Object.entries(intermediateEdgeMappingForCollapsing);
    for (const entry of entries) {
      const sourceId = entry[0]; // Id for which this collapsed node is created
      const ids = Object.keys(entry[1]);
      for (const id of ids) {
        const splitIds = splitEdgeId(id);
        if (splitIds.length >= 2) {
          const [id1, id2] = splitIds;
          const id = createTemporaryEdgeId(id1, id2);
          newEdgesMap[id] = createAndGetIntermediateEdge(id, id1, id2, {
            isDueToCollapse: true,
            componentId: sourceId,
          });
        }
      }
    }

    return newEdgesMap;
  }, [createAndGetIntermediateEdge, intermediateEdgeMappingForCollapsing]);

  // Edges created when node is expanded/Collapsed
  const intermediateEdgesMapForScrolledNodes: Record<string, Edge> = useMemo(() => {
    const newEdgesMap: Record<string, Edge> = {};
    const entries = Object.entries(intermediateEdgeMappingForScrolling);

    for (const [id, sourceMap] of entries) {
      for (const edgeId of Object.keys(sourceMap)) {
        const splitNodeId = splitEdgeId(edgeId);
        if (splitNodeId.length >= 2) {
          /**
           * if intermediate edge is connected to a target-schema node, then source for the edge should be the intermediate node
           * if intermediate edge is connected to a source-schema node, then source for the edge should be the source schema node
           * if intermediate edge is connected to a function node and the scrolled out node is source, i.e. this is on the input side, then source for the edge should be the intermediate node
           * For all other cases, source-schema/function node should be the source for the edge
           */
          const [source, target] = isTargetNode(splitNodeId[0])
            ? [splitNodeId[1], splitNodeId[0]]
            : isSourceNode(splitNodeId[0])
              ? [splitNodeId[0], splitNodeId[1]]
              : isSourceNode(id)
                ? [splitNodeId[1], splitNodeId[0]]
                : [splitNodeId[0], splitNodeId[1]];

          newEdgesMap[edgeId] = createAndGetIntermediateEdge(edgeId, source, target, { isDueToScroll: true, componentId: id });
        }
      }
    }

    return newEdgesMap;
  }, [createAndGetIntermediateEdge, intermediateEdgeMappingForScrolling]);

  useEffect(() => {
    const edgeChanges: Record<string, EdgeChange> = {};
    const allTemporaryConnections = {
      ...intermediateEdgesMapForCollapsedNodes,
      ...intermediateEdgesMapForScrolledNodes,
    };

    for (const [id, edge] of Object.entries(allTemporaryConnections)) {
      edgeChanges[id] = {
        type: 'add',
        item: edge,
      };
    }

    for (const edge of edges) {
      // Only remove the collapsable kinda edges
      if (edge.data?.isIntermediate) {
        const id = edge.id;
        if (allTemporaryConnections[id]) {
          delete edgeChanges[id];
        } else {
          edgeChanges[id] = {
            type: 'remove',
            id: id,
          };
        }
      }
    }

    if (Object.entries(edgeChanges).length > 0) {
      applyEdgeChanges(Object.values(edgeChanges), edges);
    }
  }, [edges, intermediateEdgesMapForCollapsedNodes, intermediateEdgesMapForScrolledNodes]);

  useEffect(() => {
    setFunctionNodesForDragDrop(
      Object.entries(functionNodes).map(([key, functionData]) => getFunctionNode(functionData, key, functionData.position))
    );
  }, [functionNodes]);

  return {
    edges: [
      ...directEdges,
      ...Object.values(intermediateEdgesMapForCollapsedNodes),
      ...Object.values(intermediateEdgesMapForScrolledNodes),
    ],
    nodes: [
      ...Object.values(sourceNodesMap),
      ...Object.values(targetNodesMap),
      ...functionNodesForDragDrop,
      ...Object.values(nodesForScroll),
    ],
    setFunctionNodes: setFunctionNodesForDragDrop,
  };
};

export default useReactFlowStates;
