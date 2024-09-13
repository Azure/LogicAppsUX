import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { applyEdgeChanges, type EdgeChange, type Edge, type Node, type NodeChange, applyNodeChanges, type XYPosition } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { convertWholeDataMapToLayoutTree, isFunctionNode, isSourceNode, isTargetNode } from '../../utils/ReactFlow.Util';
import { createEdgeId, createTemporaryEdgeId, splitEdgeId } from '../../utils/Edge.Utils';
import { getFunctionNode } from '../../utils/Function.Utils';
import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
import { NodeIds } from '../../constants/ReactFlowConstants';
import { updateCanvasDimensions, updateFunctionNodesPosition } from '../../core/state/DataMapSlice';

type ReactFlowStatesProps = {
  newWidth?: number;
  newHeight?: number;
  newX?: number;
  newY?: number;
};

const updateEdgeForHandles = (edge: Edge) => {
  const newEdge = { ...edge };
  if (isSourceNode(edge.source) || edge.source.startsWith('top-left-') || edge.source.startsWith('bottom-left-')) {
    newEdge.sourceHandle = edge.source;
    newEdge.source = NodeIds.source;
  }

  if (isTargetNode(edge.target) || edge.target.startsWith('top-right-') || edge.target.startsWith('bottom-right-')) {
    newEdge.targetHandle = edge.target;
    newEdge.target = NodeIds.target;
  }

  return newEdge;
};

const useReactFlowStates = (props: ReactFlowStatesProps) => {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const { newWidth, newHeight, newX, newY } = props;

  const {
    functionNodes: functionNodesMap,
    flattenedSourceSchema,
    flattenedTargetSchema,
    dataMapConnections,
    intermediateEdgeMappingForCollapsing,
    intermediateEdgeMappingForScrolling,
  } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const currentCanvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { width: currentWidth, height: currentHeight, x: currentX, y: currentY } = currentCanvasRect;

  const edgesFromSchema: Record<string, Edge> = useMemo(() => {
    const edges: Record<string, Edge> = {};
    if (Object.entries(dataMapConnections).length > 0) {
      const layout = convertWholeDataMapToLayoutTree(flattenedSourceSchema, flattenedTargetSchema, functionNodesMap, dataMapConnections);
      layout.edges.forEach((edge) => {
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

        edges[newEdge.id] = updateEdgeForHandles(newEdge);
      });
    }

    return edges;
  }, [dataMapConnections, flattenedSourceSchema, flattenedTargetSchema, functionNodesMap]);

  const createAndGetIntermediateEdge = useCallback((id: string, sourceId: string, targetId: string, data?: Record<string, any>): Edge => {
    const newEdge: Edge = {
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

    return updateEdgeForHandles(newEdge);
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

  // Add/update edges
  useEffect(() => {
    const changes: Record<string, EdgeChange> = {};
    const updatedEdges = {
      ...intermediateEdgesMapForCollapsedNodes,
      ...intermediateEdgesMapForScrolledNodes,
      ...edgesFromSchema,
    };

    for (const [id, edge] of Object.entries(updatedEdges)) {
      changes[id] = {
        type: 'add',
        item: edge,
      };
    }

    for (const edge of edges) {
      const id = edge.id;

      if (updatedEdges[id]) {
        delete changes[id];
      } else {
        changes[id] = {
          type: 'remove',
          id: id,
        };
      }
    }

    if (Object.entries(changes).length > 0) {
      const newEdges = applyEdgeChanges(Object.values(changes), edges);
      setEdges(newEdges);
    }
  }, [edges, edgesFromSchema, intermediateEdgesMapForCollapsedNodes, intermediateEdgesMapForScrolledNodes, setEdges]);

  // Add/update Function nodes
  useEffect(() => {
    const changes: Record<string, NodeChange> = {};
    for (const [key, functionData] of Object.entries(functionNodesMap)) {
      changes[key] = {
        type: 'add',
        item: getFunctionNode(functionData, key, functionData.position),
      };
    }

    for (const node of nodes) {
      const id = node.id;
      if (isFunctionNode(id)) {
        const functionData = functionNodesMap[id];
        if (functionData) {
          const functionNode = getFunctionNode(functionData, id, functionData.position);
          if (functionNode) {
            if (functionNode.position.x !== node.position.x || functionNode.position.y !== node.position.y) {
              changes[id] = {
                type: 'position',
                id: id,
                position: functionNode.position,
              };
            } else {
              delete changes[id];
            }
          }
        } else {
          changes[id] = {
            type: 'remove',
            id: id,
          };
        }
      }
    }

    if (Object.entries(changes).length > 0) {
      const newNodes = applyNodeChanges(Object.values(changes), nodes);
      setNodes(newNodes);
    }
  }, [functionNodesMap, nodes, setNodes]);

  // Set new positions for functionNodes in relation to the canvas size
  useEffect(() => {
    if (
      newWidth !== undefined &&
      newHeight !== undefined &&
      currentHeight !== undefined &&
      currentWidth !== undefined &&
      newX !== undefined &&
      newY !== undefined &&
      currentX !== undefined &&
      currentY !== undefined &&
      (newWidth !== currentWidth || newHeight !== currentHeight || newX !== currentX || newY !== currentY)
    ) {
      //update function node positions
      if (currentWidth !== 0 && newWidth !== currentWidth) {
        let xChange = 0;
        // Sorta % increase in width so we will increase the x position of the function nodes
        if (newWidth > currentWidth) {
          xChange = (newWidth - currentWidth) / currentWidth + 1;
        } else {
          xChange = 1 - (currentWidth - newWidth) / currentWidth;
        }

        const updatedPositions: Record<string, XYPosition> = {};
        for (const [key, functionData] of Object.entries(functionNodesMap)) {
          const node = getFunctionNode(functionData, key, functionData.position);
          updatedPositions[node.id] = {
            x: node.position.x * xChange,
            y: node.position.y,
          };
        }
        dispatch(updateFunctionNodesPosition(updatedPositions));
      }

      dispatch(
        updateCanvasDimensions({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        })
      );
    }
  }, [functionNodesMap, newWidth, newHeight, currentWidth, currentHeight, newX, newY, currentX, currentY, dispatch]);

  // Set default source and target nodes +
  // Update position if canvas size changes
  useEffect(() => {
    const changes: Record<string, NodeChange> = {};
    if (newWidth !== undefined && newHeight !== undefined) {
      const currentSourceNode = nodes.find((node) => node.id === NodeIds.source);
      const currentTargetNode = nodes.find((node) => node.id === NodeIds.target);

      const newSourceNodePosition = {
        x: 0,
        y: 0,
      };

      const newTargetNodePosition = {
        x: newWidth - 300,
        y: 0,
      };

      if (currentSourceNode) {
        if (currentSourceNode.position.x !== newSourceNodePosition.x || currentSourceNode.position.y !== newSourceNodePosition.y) {
          changes[NodeIds.source] = {
            type: 'position',
            id: NodeIds.source,
            position: newSourceNodePosition,
          };
        }
      } else {
        changes[NodeIds.source] = {
          type: 'add',
          item: {
            id: NodeIds.source,
            type: 'schemaPanel',
            data: {},
            position: newSourceNodePosition,
          },
        };
      }

      if (currentTargetNode) {
        if (currentTargetNode.position.x !== newTargetNodePosition.x || currentTargetNode.position.y !== newTargetNodePosition.y) {
          changes[NodeIds.target] = {
            type: 'position',
            id: NodeIds.target,
            position: newTargetNodePosition,
          };
        }
      } else {
        changes[NodeIds.target] = {
          type: 'add',
          item: {
            id: NodeIds.target,
            type: 'schemaPanel',
            data: {},
            position: newTargetNodePosition,
          },
        };
      }
    }

    if (Object.entries(changes).length > 0) {
      const newNodes = applyNodeChanges(Object.values(changes), nodes);
      setNodes(newNodes);
    }
  }, [nodes, newWidth, newHeight, setNodes]);

  return { nodes, edges };
};

export default useReactFlowStates;
