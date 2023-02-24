import { functionNodeCardSize, schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../constants/NodeConstants';
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
    id: 'root',
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
export const applyCustomLayout = async (graph: RootLayoutNode, useExpandedFunctionCards?: boolean): Promise<RootLayoutNode> => {
  const schemaNodeCardVGap = 8;
  const xInterval = functionNodeCardSize * (useExpandedFunctionCards ? 3 : 1.5);
  const yInterval = functionNodeCardSize * (useExpandedFunctionCards ? 2 : 1);
  const maxFunctionsPerToolbarRow = 4;
  const functionToolbarStartY = -64;

  const getSchemaNodeYPos = (nodeIdx: number) => nodeIdx * (schemaNodeCardHeight + (nodeIdx === 0 ? 0 : schemaNodeCardVGap));

  // Source schema node positioning
  const srcSchemaStartX = 0;
  graph.children[0].children.forEach((srcSchemaNode, idx) => {
    srcSchemaNode.x = srcSchemaStartX;
    srcSchemaNode.y = getSchemaNodeYPos(idx);
  });

  // Function node positioning
  const fnStartX = srcSchemaStartX + schemaNodeCardDefaultWidth + xInterval;
  let farthestRightFnNodeXPos = fnStartX; // Find farthest right function node to position target schema from
  const nextAvailableToolbarSpot = [0, 0]; // Grid representation (one node slot == 1x1)
  const fnNodeIdsThatOnlyOutputToTargetSchema: string[] = [];

  const compileInputPositionsAndOutputDetails = (edgeArray: LayoutEdge[], fnNodeId: string): [[number, number][], number, boolean] => {
    const compiledInputPositions: [number, number][] = [];
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
            compiledInputPositions.push([inputNode.x, inputNode.y]);
          } else {
            LogService.error(LogCategory.ReactFlowUtils, 'Layouting', {
              message: `Failed to recursively calculate inputNode's position`,
            });
          }
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
    const fnNode = graph.children[1].children.find((layoutFnNode) => layoutFnNode.id === fnNodeId);
    const tgtSchemaOutputYPositions = graph.edges
      .filter((edge) => edge.sourceId === fnNodeId)
      .map((edge) => {
        const tgtSchemaNode = graph.children[2].children.find((tgtSchemaNode) => tgtSchemaNode.id === edge.targetId);
        return tgtSchemaNode?.y !== undefined ? tgtSchemaNode.y : 0;
      });

    if (fnNode) {
      fnNode.x = tgtSchemaStartX - xInterval;
      fnNode.y = tgtSchemaOutputYPositions.reduce((curYTotal, curYPos) => curYTotal + curYPos, 0) / tgtSchemaOutputYPositions.length;
    }
  });

  // Declare diagram size
  const lastTargetSchemaNode =
    graph.children[2].children.length > 0 ? graph.children[2].children[graph.children[2].children.length - 1] : undefined;
  graph.width = tgtSchemaStartX + schemaNodeCardDefaultWidth;
  graph.height = lastTargetSchemaNode?.y !== undefined ? lastTargetSchemaNode.y : 0;

  return Promise.resolve(graph);
};
