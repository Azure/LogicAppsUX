import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { applyEdgeChanges, type EdgeChange, type Edge, type Node, type NodeChange, applyNodeChanges, type XYPosition } from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';
import { convertWholeDataMapToLayoutTree, isFunctionNode, panelWidth, panelWidthWithoutHandles } from '../../utils/ReactFlow.Util';
import { createEdgeId } from '../../utils/Edge.Utils';
import { getFunctionNode } from '../../utils/Function.Utils';
import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
import { NodeIds } from '../../constants/ReactFlowConstants';
import { updateCanvasDimensions, updateFunctionNodesPosition } from '../../core/state/DataMapSlice';
import type { FunctionData } from '../../models/Function';

type ReactFlowStatesProps = {
  newWidth?: number;
  newHeight?: number;
  newX?: number;
  newY?: number;
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
          source: isFunctionNode(edge.sourceId) ? edge.sourceId : NodeIds.source,
          target: isFunctionNode(edge.targetId) ? edge.targetId : NodeIds.target,
          type: 'connectedEdge',
          reconnectable: 'target',
          zIndex: 150,
          interactionWidth: 10,
          data: {
            isRepeating: edge.isRepeating,
            sourceHandleId: edge.sourceId,
            targetHandleId: edge.targetId,
          },
          focusable: true,
          deletable: true,
          selectable: true,
        };

        edges[newEdge.id] = newEdge;
      });
    }

    return edges;
  }, [dataMapConnections, flattenedSourceSchema, flattenedTargetSchema, functionNodesMap]);

  useEffect(() => {
    const changes: Record<string, EdgeChange> = {};
    for (const [id, edge] of Object.entries(edgesFromSchema)) {
      changes[id] = {
        type: 'add',
        item: edge,
      };
    }

    for (const edge of edges) {
      const id = edge.id;

      if (edgesFromSchema[id]) {
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
  }, [edges, edgesFromSchema, setEdges]);

  // Add/update Function nodes
  useEffect(() => {
    const changes: Record<string, NodeChange> = {};
    for (const [key, functionData] of Object.entries(functionNodesMap)) {
      const data = functionData as FunctionData;
      changes[key] = {
        type: 'add',
        item: getFunctionNode(data, key, data.position),
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
          const data = functionData as FunctionData;
          const node = getFunctionNode(data, key, data.position);
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
        x: newWidth - panelWidthWithoutHandles,
        y: 0,
      };

      const dimensions = {
        width: panelWidth,
        height: newHeight,
      };

      if (currentSourceNode) {
        if (currentSourceNode.position.x !== newSourceNodePosition.x || currentSourceNode.position.y !== newSourceNodePosition.y) {
          changes[NodeIds.source] = {
            type: 'position',
            id: NodeIds.source,
            position: newSourceNodePosition,
          };
        } else if (currentSourceNode.width !== panelWidth || currentSourceNode.height !== newHeight) {
          changes[NodeIds.source] = {
            type: 'dimensions',
            id: NodeIds.source,
            resizing: true,
            setAttributes: true,
            dimensions,
          };
        }
      } else {
        changes[NodeIds.source] = {
          type: 'add',
          item: {
            id: NodeIds.source,
            type: 'schemaPanel',
            data: {},
            draggable: false,
            selectable: false,
            deletable: false,
            dragging: false,
            selected: false,
            position: newSourceNodePosition,
            ...dimensions,
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
        } else if (currentTargetNode.width !== panelWidth || currentTargetNode.height !== newHeight) {
          changes[NodeIds.target] = {
            type: 'dimensions',
            id: NodeIds.target,
            resizing: true,
            setAttributes: true,
            dimensions,
          };
        }
      } else {
        changes[NodeIds.target] = {
          type: 'add',
          item: {
            id: NodeIds.target,
            type: 'schemaPanel',
            draggable: false,
            selectable: false,
            deletable: false,
            dragging: false,
            selected: false,
            data: {},
            position: newTargetNodePosition,
            ...dimensions,
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
