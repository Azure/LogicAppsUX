import { functionNodeCardSize, schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../constants/NodeConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { generateInputHandleId, isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  labels: string[];
}

export interface LayoutNode {
  id: string;
  x?: number;
  y?: number;
  children?: LayoutNode[];
}

export interface RootLayoutNode {
  id: string;
  children: LayoutNode[];
  edges: LayoutEdge[];
  width?: number;
  height?: number;
}

export const convertDataMapNodesToLayoutTree = (
  currentSourceSchemaNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  currentTargetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): RootLayoutNode => {
  let nextEdgeIndex = 0;
  const layoutEdges: LayoutEdge[] = [];

  Object.values(connections).forEach((connection) => {
    // Make sure that each connection and its nodes are actively on the canvas
    if (
      !currentFunctionNodes[connection.self.reactFlowKey] &&
      !currentSourceSchemaNodes.some((srcSchemaNode) => srcSchemaNode.key === connection.self.node.key) &&
      currentTargetSchemaNode.key !== connection.self.node.key &&
      !currentTargetSchemaNode.children.some((childTgtNode) => childTgtNode.key === connection.self.node.key)
    ) {
      return;
    }

    Object.values(connection.inputs).forEach((inputValueArray, inputIndex) => {
      inputValueArray.forEach((inputValue, inputValueIndex) => {
        if (isConnectionUnit(inputValue)) {
          const target = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [connection.self.node.inputs[inputIndex].name]
              : [generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex)]
            : [];

          const nextEdge: LayoutEdge = {
            id: `e${nextEdgeIndex}`,
            sourceId: inputValue.reactFlowKey,
            targetId: target,
            labels,
          };

          layoutEdges.push(nextEdge);
          nextEdgeIndex += 1;
        }
      });
    });
  });

  // NOTE: Dummy nodes allow proper layouting when no real nodes exist yet
  const layoutTree: RootLayoutNode = {
    id: 'root',
    children: [
      {
        id: 'sourceSchemaBlock',
        children: [
          ...currentSourceSchemaNodes.map((srcNode) => ({
            id: addSourceReactFlowPrefix(srcNode.key),
          })),
          { id: 'srcDummyNode' },
        ],
      },
      {
        id: 'functionsBlock',
        children: [
          ...Object.keys(currentFunctionNodes).map((fnNodeKey) => ({
            id: fnNodeKey,
          })),
          { id: 'fnDummyNode' },
        ],
      },
      {
        id: 'targetSchemaBlock',
        children: [
          { id: addTargetReactFlowPrefix(currentTargetSchemaNode.key) },
          ...currentTargetSchemaNode.children.map((childNode) => ({
            id: addTargetReactFlowPrefix(childNode.key),
          })),
        ],
      },
    ],
    edges: layoutEdges,
  };

  return layoutTree;
};

export const convertWholeDataMapToLayoutTree = (
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  functionNodes: FunctionDictionary,
  connections: ConnectionDictionary
): RootLayoutNode => {
  let nextEdgeIndex = 0;
  const layoutEdges: LayoutEdge[] = [];

  Object.values(connections).forEach((connection) => {
    Object.values(connection.inputs).forEach((inputValueArray, inputIndex) => {
      inputValueArray.forEach((inputValue, inputValueIndex) => {
        if (isConnectionUnit(inputValue)) {
          const target = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [connection.self.node.inputs[inputIndex].name]
              : [generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex)]
            : [];

          const nextEdge: LayoutEdge = {
            id: `e${nextEdgeIndex}`,
            sourceId: inputValue.reactFlowKey,
            targetId: target,
            labels,
          };

          layoutEdges.push(nextEdge);
          nextEdgeIndex += 1;
        }
      });
    });
  });

  // NOTE: Dummy nodes allow proper layouting when no real nodes exist yet
  const layoutTree: RootLayoutNode = {
    id: 'root',
    children: [
      {
        id: 'sourceSchemaBlock',
        children: [
          ...Object.values(flattenedSourceSchema).map((srcNode) => ({
            id: addSourceReactFlowPrefix(srcNode.key),
          })),
          { id: 'srcDummyNode' },
        ],
      },
      {
        id: 'functionsBlock',
        children: [
          ...Object.keys(functionNodes).map((fnNodeKey) => ({
            id: fnNodeKey,
            width: functionNodeCardSize,
            height: functionNodeCardSize,
          })),
          { id: 'fnDummyNode' },
        ],
      },
      {
        id: 'targetSchemaBlock',
        children: [
          ...Object.values(flattenedTargetSchema).map((childNode) => ({
            id: addTargetReactFlowPrefix(childNode.key),
          })),
          { id: 'tgtDummyNode' },
        ],
      },
    ],
    edges: layoutEdges,
  };

  return layoutTree;
};

/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const applyCustomLayout = async (graph: RootLayoutNode, useExpandedFunctionCards?: boolean): Promise<RootLayoutNode> => {
  const schemaNodeCardVGap = 8;
  const xInterval = functionNodeCardSize * (useExpandedFunctionCards ? 3 : 1.5);
  const yInterval = functionNodeCardSize * (useExpandedFunctionCards ? 2 : 1);
  const maxFunctionsPerToolbarRow = 4;
  const functionToolbarStartY = -64;

  const getSchemaNodeYPos = (nodeIdx: number) => nodeIdx * (schemaNodeCardHeight + (nodeIdx === 0 ? 0 : schemaNodeCardVGap));

  if (graph.children[0]?.children && graph.children[1]?.children && graph.children[2]?.children) {
    // Assign placeholder values to node blocks as they aren't used w/ this custom layouting
    graph.children[0].x = 0;
    graph.children[0].y = 0;
    graph.children[1].x = 0;
    graph.children[1].y = 0;
    graph.children[2].x = 0;
    graph.children[2].y = 0;

    // Source schema node positioning
    const srcSchemaStartX = 0;
    graph.children[0].children.forEach((srcSchemaNode, idx) => {
      srcSchemaNode.x = srcSchemaStartX;
      srcSchemaNode.y = getSchemaNodeYPos(idx);
    });

    // Function node positioning
    // - Find farthest right function node to position target schema from
    const fnStartX = srcSchemaStartX + schemaNodeCardDefaultWidth + xInterval;
    let farthestRightFnNodeXPos = fnStartX;
    const nextAvailableToolbarSpot = [0, 0]; // Grid representation (one node slot == 1x1)
    const fnNodeIdsThatOnlyOutputToTargetSchema: string[] = [];

    const compileInputPositionsAndOutputDetails = (edgeArray: LayoutEdge[], fnNodeId: string): [number[][], number, boolean] => {
      const compiledInputPositions: number[][] = [];
      let numOutputs = 0;
      let fnNodeOnlyOutputsToTargetSchema = true;

      edgeArray.forEach((edge) => {
        if (edge.sourceId === fnNodeId) {
          numOutputs += 1;

          if (!edge.targetId.includes(targetPrefix)) {
            fnNodeOnlyOutputsToTargetSchema = false;
          }
        } else if (edge.targetId === fnNodeId) {
          // Find input node, and get or calculate its position
          const inputNode = [...graph.children[0].children!, ...graph.children[1].children!].find(
            (srcSchemaOrFnNode) => srcSchemaOrFnNode.id === edge.sourceId
          );

          if (inputNode) {
            if (inputNode.x === undefined || inputNode.y === undefined) {
              // Should recursively make sure all input chains are or get calculated
              calculateFnNodePosition(inputNode);
            }

            compiledInputPositions.push([inputNode.x as number, inputNode.y as number]);
          }
        }
      });

      return [compiledInputPositions, numOutputs, fnNodeOnlyOutputsToTargetSchema];
    };

    const calculateFnNodePosition = (fnNode: LayoutNode): void => {
      // Compile positions of any inputs and number of outputs
      const [compiledInputPositions, numOutputs, fnNodeOnlyOutputsToTargetSchema] = compileInputPositionsAndOutputDetails(
        graph.edges,
        fnNode.id
      );

      // Initial calculation
      let fnNodeXPos: number | undefined = undefined;
      let fnNodeYPos: number | undefined = undefined;

      if (compiledInputPositions.length === 0) {
        if (numOutputs === 0) {
          // Completely unconnected nodes -> place in next toolbar slot
          fnNodeXPos = fnStartX + nextAvailableToolbarSpot[0] * xInterval;
          fnNodeYPos = functionToolbarStartY - nextAvailableToolbarSpot[1] * yInterval;

          const hasReachedRowMax = nextAvailableToolbarSpot[0] === maxFunctionsPerToolbarRow - 1;
          nextAvailableToolbarSpot[1] = hasReachedRowMax ? nextAvailableToolbarSpot[1] + 1 : nextAvailableToolbarSpot[1];
          nextAvailableToolbarSpot[0] = hasReachedRowMax ? 0 : nextAvailableToolbarSpot[0] + 1;
        } else if (fnNodeOnlyOutputsToTargetSchema) {
          fnNodeIdsThatOnlyOutputToTargetSchema.push(fnNode.id);
        }

        // Else -> Don't do anything if it outputs to one or more function nodes as they'll trigger this node's positioning
      } else if (compiledInputPositions.length === 1) {
        // xPos == xInterval right of input
        // yPos == same as input
        fnNodeXPos = compiledInputPositions[0][0] + xInterval;
        fnNodeYPos = compiledInputPositions[0][1];
      } else {
        // xPos == xInterval right of the closest (farthest right?) input
        // yPos == middle of all inputs
        fnNodeXPos = 0;
        compiledInputPositions.forEach((inputCoords) => {
          if (inputCoords[0] > (fnNodeXPos as number)) {
            fnNodeXPos = inputCoords[0];
          }
        });

        fnNodeXPos = fnNodeXPos + xInterval;
        fnNodeYPos = compiledInputPositions.reduce((curYTotal, coords) => curYTotal + coords[1], 0) / compiledInputPositions.length;
      }

      // Collision checking & handling (only adjusts yPos)
      // TODO: while xPos/yPos === same as some other current fnNode, check availability of next top then bottom yInterval spots

      // Final assignment
      fnNode.x = fnNodeXPos === undefined ? fnNodeXPos : fnNodeXPos + fnStartX;
      fnNode.y = fnNodeYPos;

      if (fnNode.x !== undefined && fnNode.x > farthestRightFnNodeXPos) {
        farthestRightFnNodeXPos = fnNode.x;
      }
    };

    graph.children[1].children.forEach((fnNode) => {
      calculateFnNodePosition(fnNode);
    });

    // Target schema node positioning
    const tgtSchemaStartX = farthestRightFnNodeXPos + xInterval + schemaNodeCardDefaultWidth;
    graph.children[2].children.forEach((tgtSchemaNode, idx) => {
      tgtSchemaNode.x = tgtSchemaStartX;
      tgtSchemaNode.y = getSchemaNodeYPos(idx);
    });

    // Finally, position remaining function nodes that only output to the target schema
    // (and thus must wait until after its layout is computed)
    fnNodeIdsThatOnlyOutputToTargetSchema.forEach((fnNodeId) => {
      const fnNode = graph.children[1].children?.find((layoutFnNode) => layoutFnNode.id === fnNodeId);
      const tgtSchemaOutputYPositions =
        graph.edges
          ?.filter((edge) => edge.sourceId === fnNodeId)
          .map((edge) => {
            return graph.children[2].children?.find((tgtSchemaNode) => tgtSchemaNode.id === edge.targetId)?.y ?? 0;
          }) ?? [];

      if (fnNode) {
        fnNode.x = tgtSchemaStartX - xInterval;
        fnNode.y = tgtSchemaOutputYPositions.reduce((curYTotal, curYPos) => curYTotal + curYPos, 0) / tgtSchemaOutputYPositions.length;
      }
    });

    // Declare diagram size
    graph.width = tgtSchemaStartX + schemaNodeCardDefaultWidth;
    graph.height = graph.children[2].children[graph.children[2].children.length - 1].y;
  }

  return Promise.resolve(graph);
};
