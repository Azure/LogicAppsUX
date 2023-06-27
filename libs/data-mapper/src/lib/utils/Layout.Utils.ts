import {
  expandedFunctionCardMaxWidth,
  schemaNodeCardDefaultWidth,
  schemaNodeCardHeight,
  simpleFunctionCardDiameter,
} from '../constants/NodeConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { generateInputHandleId, isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { LogCategory, LogService } from './Logging.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';

const rootLayoutNodeId = 'root';
enum LayoutContainer {
  SourceSchema = 'sourceSchemaBlock',
  Functions = 'functionsBlock',
  TargetSchema = 'targetSchemaBlock',
}

type GraphCoord = [number, number]; // [x, y]

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

export interface ContainerLayoutNode {
  id: LayoutContainer;
  children: LayoutNode[];
}

export interface RootLayoutNode {
  id: typeof rootLayoutNodeId;
  children: ContainerLayoutNode[];
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
          const targetId = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [connection.self.node.inputs[inputIndex].name]
              : [generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex)]
            : [];

          const nextEdge: LayoutEdge = {
            id: `e${nextEdgeIndex}`,
            sourceId: inputValue.reactFlowKey,
            targetId,
            labels,
          };

          layoutEdges.push(nextEdge);
          nextEdgeIndex += 1;
        }
      });
    });
  });

  const layoutTree: RootLayoutNode = {
    id: rootLayoutNodeId,
    children: [
      {
        id: LayoutContainer.SourceSchema,
        children: currentSourceSchemaNodes.map((srcNode) => ({ id: addSourceReactFlowPrefix(srcNode.key) })),
      },
      {
        id: LayoutContainer.Functions,
        children: Object.keys(currentFunctionNodes).map((fnNodeKey) => ({ id: fnNodeKey })),
      },
      {
        id: LayoutContainer.TargetSchema,
        children: [
          { id: addTargetReactFlowPrefix(currentTargetSchemaNode.key) },
          ...currentTargetSchemaNode.children.map((childTgtNode) => ({
            id: addTargetReactFlowPrefix(childTgtNode.key),
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
          const targetId = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [connection.self.node.inputs[inputIndex].name]
              : [generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex)]
            : [];

          const nextEdge: LayoutEdge = {
            id: `e${nextEdgeIndex}`,
            sourceId: inputValue.reactFlowKey,
            targetId,
            labels,
          };

          layoutEdges.push(nextEdge);
          nextEdgeIndex += 1;
        }
      });
    });
  });

  const layoutTree: RootLayoutNode = {
    id: rootLayoutNodeId,
    children: [
      {
        id: LayoutContainer.SourceSchema,
        children: Object.values(flattenedSourceSchema).map((srcNode) => ({ id: addSourceReactFlowPrefix(srcNode.key) })),
      },
      {
        id: LayoutContainer.Functions,
        children: Object.keys(functionNodes).map((fnNodeKey) => ({ id: fnNodeKey })),
      },
      {
        id: LayoutContainer.TargetSchema,
        children: Object.values(flattenedTargetSchema).map((tgtNode) => ({ id: addTargetReactFlowPrefix(tgtNode.key) })),
      },
    ],
    edges: layoutEdges,
  };

  return layoutTree;
};

/* eslint-disable no-param-reassign */
export const applyCustomLayout = async (
  graph: RootLayoutNode,
  useExpandedFunctionCards?: boolean,
  isOverview?: boolean
): Promise<RootLayoutNode> => {
  const schemaNodeCardVGap = 8;
  const xInterval = (useExpandedFunctionCards ? expandedFunctionCardMaxWidth : simpleFunctionCardDiameter) * 1.5;
  const yInterval = simpleFunctionCardDiameter * 1.5;
  const maxFunctionsPerToolbarRow = 4;
  const functionToolbarStartY = -1 * simpleFunctionCardDiameter;
  const nodeCollisionXThreshold = (useExpandedFunctionCards ? expandedFunctionCardMaxWidth : simpleFunctionCardDiameter) * 1.25;
  const nodeCollisionYThreshold = simpleFunctionCardDiameter * 1.2;

  const getSchemaNodeYPos = (nodeIdx: number) => nodeIdx * (schemaNodeCardHeight + (nodeIdx === 0 ? 0 : schemaNodeCardVGap));

  // Source schema node positioning
  const srcSchemaStartX = 0;
  graph.children[0].children.forEach((srcSchemaNode, idx) => {
    srcSchemaNode.x = srcSchemaStartX;
    srcSchemaNode.y = getSchemaNodeYPos(idx);
  });

  // Function node positioning
  const fnStartX = srcSchemaStartX + schemaNodeCardDefaultWidth * 1.5 + (isOverview ? xInterval : 0);
  let farthestRightFnNodeXPos = fnStartX; // Find farthest right function node to position target schema from
  const nextAvailableToolbarSpot: GraphCoord = [0, 0]; // Grid representation (one node slot == 1x1)
  const fnNodeIdsThatOnlyOutputToTargetSchema: string[] = [];

  const compileInputPositionsAndOutputDetails = (edgeArray: LayoutEdge[], fnNodeId: string): [GraphCoord[], number, boolean] => {
    const compiledInputPositions: GraphCoord[] = [];
    let numOutputs = 0;
    let fnNodeOnlyOutputsToTargetSchema = true;

    edgeArray.forEach((edge) => {
      // Current function is the source
      if (edge.sourceId === fnNodeId) {
        numOutputs += 1;

        if (!edge.targetId.includes(targetPrefix)) {
          fnNodeOnlyOutputsToTargetSchema = false;
        }
      } else if (edge.targetId === fnNodeId) {
        // Current function is the target
        // Find input node, and get or calculate its position
        const inputNode = [...graph.children[0].children, ...graph.children[1].children].find(
          (srcSchemaOrFnNode) => srcSchemaOrFnNode.id === edge.sourceId
        );

        if (inputNode) {
          if (inputNode.x === undefined || inputNode.y === undefined) {
            // Should recursively make sure all input chains are or get calculated
            calculateFnNodePosition(inputNode);
          }

          // Confirm that recursive call above actually calculated the inputNode's position
          if (inputNode.x !== undefined && inputNode.y !== undefined) {
            // Subtract fnStartX for functions so as to not compound fnStartX
            compiledInputPositions.push([inputNode.x === srcSchemaStartX ? srcSchemaStartX : inputNode.x - fnStartX, inputNode.y]);
          } else {
            LogService.error(LogCategory.ReactFlowUtils, 'Layouting', {
              message: `Failed to recursively calculate inputNode's position`,
              data: {
                nodeData:
                  process.env.NODE_ENV === 'development'
                    ? {
                        inputNodeId: inputNode.id, // Same as edgeSourceId
                        edgeTargetId: edge.targetId,
                      }
                    : undefined,
              },
            });
          }
        } else {
          LogService.error(LogCategory.ReactFlowUtils, 'Layouting', {
            message: `Failed to find input node from an edge's sourceId`,
            data: {
              nodeData:
                process.env.NODE_ENV === 'development'
                  ? {
                      edgeSourceId: edge.sourceId,
                      edgeTargetId: edge.targetId,
                    }
                  : undefined,
            },
          });
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
    let isGoingOnToolbar = false;

    if (compiledInputPositions.length === 0) {
      if (numOutputs === 0) {
        // Completely unconnected nodes -> place in next toolbar slot
        fnNodeXPos = nextAvailableToolbarSpot[0] * xInterval + fnStartX;
        fnNodeYPos = functionToolbarStartY - nextAvailableToolbarSpot[1] * yInterval;
        isGoingOnToolbar = true;

        const hasReachedRowMax = nextAvailableToolbarSpot[0] === maxFunctionsPerToolbarRow - 1;
        nextAvailableToolbarSpot[1] = hasReachedRowMax ? nextAvailableToolbarSpot[1] + 1 : nextAvailableToolbarSpot[1];
        nextAvailableToolbarSpot[0] = hasReachedRowMax ? 0 : nextAvailableToolbarSpot[0] + 1;
      } else if (fnNodeOnlyOutputsToTargetSchema) {
        fnNodeIdsThatOnlyOutputToTargetSchema.push(fnNode.id);
      } else {
        // No-inputs function that outputs to another function
        // - semi-rare case, so let's do something reasonably simple
        fnNodeXPos = fnStartX;
        // NOTE: Function nodes that fit this case (Ex: current-date()) are often heavily reused,
        // so we can mostly safely set their yPos to the ~center of the source schema nodes
        const centralYPos =
          graph.children[0].children.length > 2
            ? graph.children[0].children[Math.floor(graph.children[0].children.length / 2)].y
            : yInterval * 2;
        fnNodeYPos = centralYPos;
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
      let closestInputX = 0;
      compiledInputPositions.forEach((inputCoords) => {
        if (inputCoords[0] > closestInputX) {
          closestInputX = inputCoords[0];
        }
      });

      fnNodeXPos = closestInputX + xInterval;
      fnNodeYPos = compiledInputPositions.reduce((curYTotal, coords) => curYTotal + coords[1], 0) / compiledInputPositions.length;
    }

    // Add fnStartX in
    fnNodeXPos = fnNodeXPos === undefined ? undefined : fnNodeXPos + fnStartX;

    // Collision checking & handling
    if (!isGoingOnToolbar && fnNodeXPos !== undefined && fnNodeYPos !== undefined) {
      let nextYSpot = 1;
      let noCollisionFnNodeYPos = fnNodeYPos;

      // TODO: If needed, adjust node origins from top-left (? - needs verification)
      // to middle of node for extra collision detection accuracy
      const checkIfNodeHasCollision = () =>
        graph.children[1].children.some(
          (potentiallyCollidingFnNode) =>
            potentiallyCollidingFnNode.id !== fnNode.id &&
            potentiallyCollidingFnNode.y !== undefined &&
            potentiallyCollidingFnNode.x !== undefined &&
            Math.abs(potentiallyCollidingFnNode.y - noCollisionFnNodeYPos) < nodeCollisionYThreshold &&
            Math.abs(potentiallyCollidingFnNode.x - (fnNodeXPos as number)) < nodeCollisionXThreshold
        );

      while (checkIfNodeHasCollision()) {
        noCollisionFnNodeYPos = Math.max(fnNodeYPos + nextYSpot * yInterval, 0); // Cap collision handling placement at very top (y=0)

        // Check availability of next top then bottom yInterval spots
        nextYSpot = nextYSpot < 0 ? nextYSpot * -1 + 1 : nextYSpot * -1;
      }

      fnNodeYPos = noCollisionFnNodeYPos;
    }

    // Final assignment
    fnNode.x = fnNodeXPos;
    fnNode.y = fnNodeYPos;
  };

  graph.children[1].children.forEach((fnNode) => {
    calculateFnNodePosition(fnNode);

    // Quick workaround to remove the extra spacing added, should be removed when we move to unlocked positions
    if (fnNode.x) {
      fnNode.x = fnNode.x >= fnStartX ? fnNode.x - fnStartX : fnNode.x;
      if (fnNode.x > farthestRightFnNodeXPos) {
        farthestRightFnNodeXPos = fnNode.x;
      }
    }
  });

  // Target schema node positioning
  const tgtSchemaStartX = farthestRightFnNodeXPos + schemaNodeCardDefaultWidth * 1.5;
  graph.children[2].children.forEach((tgtSchemaNode, idx) => {
    tgtSchemaNode.x = tgtSchemaStartX;
    tgtSchemaNode.y = getSchemaNodeYPos(idx);
  });

  // Finally, position remaining function nodes that only output to the target schema
  // (and thus must wait until after its layout is computed)
  fnNodeIdsThatOnlyOutputToTargetSchema.forEach((fnNodeId) => {
    const fnNode = graph.children[1].children.find((layoutFnNode) => layoutFnNode.id === fnNodeId);
    const tgtSchemaOutputYPositions = graph.edges
      .filter((edge) => edge.sourceId === fnNodeId)
      .map((edge) => {
        const tgtSchemaNode = graph.children[2].children.find((tgtSchemaNode) => tgtSchemaNode.id === edge.targetId);
        return tgtSchemaNode?.y !== undefined ? tgtSchemaNode.y : 0;
      });

    if (fnNode) {
      fnNode.x = farthestRightFnNodeXPos;
      fnNode.y = tgtSchemaOutputYPositions.reduce((curYTotal, curYPos) => curYTotal + curYPos, 0) / tgtSchemaOutputYPositions.length;
    }
  });

  // Declare diagram size
  const yPositions = graph.children.flatMap((graphSections) => graphSections.children.map((sectionNodes) => sectionNodes.y ?? 0));
  const bottomMostNode = Math.max(...yPositions);

  graph.width = tgtSchemaStartX + schemaNodeCardDefaultWidth;
  graph.height = bottomMostNode + schemaNodeCardHeight;

  return Promise.resolve(graph);
};
