import { functionNodeCardSize, schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../constants/NodeConstants';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { generateInputHandleId, isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';

const elk = new ELK();

const defaultNodeGroupSpacing = '120.0';
const expandedNodeGroupSpacing = '160.0';

const defaultTreeLayoutOptions: Record<string, string> = {
  // General layout settings
  direction: 'RIGHT',
  algorithm: 'layered',
  'layering.strategy': 'INTERACTIVE',
  hierarchyHandling: 'INCLUDE_CHILDREN',
  'partitioning.activate': 'true', // Allows blocks/node-groups to be forced into specific "slots"
  'edge.thickness': '8.0',
  'spacing.nodeNodeBetweenLayers': defaultNodeGroupSpacing, // Spacing between node groups (Source schema/Functions/Target schema)
  // Settings related to node ordering (when attempting to minimize edge crossing)
  'crossingMinimization.semiInteractive': 'true',
  'considerModelOrder.strategy': 'NODES_AND_EDGES',
};

const sourceSchemaLayoutOptions: Record<string, string> = {
  'crossingMinimization.forceNodeModelOrder': 'true', // Ensures that node order is maintained
  'partitioning.partition': '0',
  'spacing.nodeNode': '12.0', // Vertical spacing between nodes
  'spacing.nodeNodeBetweenLayers': '0.0', // Horizontal spacing between nodes
  // The below settings stop some weird extra horizontal spacing when a connection/edge is present
  'spacing.edgeEdge': '0.0',
  'spacing.edgeNodeBetweenLayers': '0.0',
  'spacing.edgeEdgeBetweenLayers': '0.0',
};

const functionsLayoutOptions: Record<string, string> = {
  ...sourceSchemaLayoutOptions,
  'partitioning.partition': '1',
  'spacing.nodeNodeBetweenLayers': '80.0', // Horizontal spacing between nodes
  'spacing.nodeNode': '24.0', // Vertical spacing between nodes
};

const targetSchemaLayoutOptions: Record<string, string> = {
  ...sourceSchemaLayoutOptions,
  'partitioning.partition': '2',
};

export const convertDataMapNodesToElkGraph = (
  currentSourceSchemaNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  currentTargetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary,
  useExpandedFunctionCards: boolean
): ElkNode => {
  // NOTE: Sub-block edges[] only contain edges between nodes *within that block*
  // - the root edges[] will contain all multi-block edges (thus, src/tgt schemas should never have edges)
  let nextEdgeIndex = 0;
  const interFunctionEdges: ElkExtendedEdge[] = [];
  const interBlockEdges: ElkExtendedEdge[] = [];

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

    // Categorize connections to function<->function and any others for elkTree creation below
    Object.values(connection.inputs).forEach((inputValueArray, inputIndex) => {
      inputValueArray.forEach((inputValue, inputValueIndex) => {
        if (isConnectionUnit(inputValue)) {
          const target = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [{ text: connection.self.node.inputs[inputIndex].name }]
              : [{ text: generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex) }]
            : [];

          const nextEdge: ElkExtendedEdge = {
            id: `e${nextEdgeIndex}`,
            sources: [inputValue.reactFlowKey],
            targets: [target],
            labels,
          };

          if (isFunctionData(inputValue.node) && isFunctionData(connection.self.node)) {
            interFunctionEdges.push(nextEdge);
          } else {
            interBlockEdges.push(nextEdge);
          }

          nextEdgeIndex += 1;
        }
      });
    });
  });

  const elkTree: ElkNode = {
    id: 'root',
    layoutOptions: {
      ...defaultTreeLayoutOptions,
      'spacing.nodeNodeBetweenLayers': useExpandedFunctionCards ? expandedNodeGroupSpacing : defaultNodeGroupSpacing,
    },
    children: [
      {
        id: 'sourceSchemaBlock',
        layoutOptions: sourceSchemaLayoutOptions,
        children: [
          ...currentSourceSchemaNodes.map((srcNode) => ({
            id: addSourceReactFlowPrefix(srcNode.key),
            width: schemaNodeCardDefaultWidth,
            height: schemaNodeCardHeight,
          })),
          // NOTE: Dummy nodes allow proper layouting when no real nodes exist yet
          { id: 'srcDummyNode', width: schemaNodeCardDefaultWidth, height: schemaNodeCardHeight },
        ],
      },
      {
        id: 'functionsBlock',
        layoutOptions: functionsLayoutOptions,
        children: [
          ...Object.keys(currentFunctionNodes).map((fnNodeKey) => ({
            id: fnNodeKey,
            width: functionNodeCardSize,
            height: functionNodeCardSize,
          })),
          { id: 'fnDummyNode', width: functionNodeCardSize, height: functionNodeCardSize },
        ],
        // Only function<->function edges
        edges: interFunctionEdges,
      },
      {
        id: 'targetSchemaBlock',
        layoutOptions: targetSchemaLayoutOptions,
        children: [
          { id: addTargetReactFlowPrefix(currentTargetSchemaNode.key), width: schemaNodeCardDefaultWidth, height: schemaNodeCardHeight },
          ...currentTargetSchemaNode.children.map((childNode) => ({
            id: addTargetReactFlowPrefix(childNode.key),
            width: schemaNodeCardDefaultWidth,
            height: schemaNodeCardHeight,
          })),
        ],
      },
    ],
    edges: interBlockEdges,
  };

  return elkTree;
};

export const convertWholeDataMapToElkGraph = (
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  functionNodes: FunctionDictionary,
  connections: ConnectionDictionary,
  useExpandedFunctionCards: boolean
): ElkNode => {
  // NOTE: Sub-block edges[] only contain edges between nodes *within that block*
  // - the root edges[] will contain all multi-block edges (thus, src/tgt schemas should never have edges)
  let nextEdgeIndex = 0;
  const interFunctionEdges: ElkExtendedEdge[] = [];
  const interBlockEdges: ElkExtendedEdge[] = [];

  Object.values(connections).forEach((connection) => {
    // Categorize connections to function<->function and any others for elkTree creation below
    Object.values(connection.inputs).forEach((inputValueArray, inputIndex) => {
      inputValueArray.forEach((inputValue, inputValueIndex) => {
        if (isConnectionUnit(inputValue)) {
          const target = connection.self.reactFlowKey;
          const labels = isFunctionData(connection.self.node)
            ? connection.self.node.maxNumberOfInputs > -1
              ? [{ text: connection.self.node.inputs[inputIndex].name }]
              : [{ text: generateInputHandleId(connection.self.node.inputs[inputIndex].name, inputValueIndex) }]
            : [];

          const nextEdge: ElkExtendedEdge = {
            id: `e${nextEdgeIndex}`,
            sources: [inputValue.reactFlowKey],
            targets: [target],
            labels,
          };

          if (isFunctionData(inputValue.node) && isFunctionData(connection.self.node)) {
            interFunctionEdges.push(nextEdge);
          } else {
            interBlockEdges.push(nextEdge);
          }

          nextEdgeIndex += 1;
        }
      });
    });
  });

  const elkTree: ElkNode = {
    id: 'root',
    layoutOptions: {
      ...defaultTreeLayoutOptions,
      'spacing.nodeNodeBetweenLayers': useExpandedFunctionCards ? expandedNodeGroupSpacing : defaultNodeGroupSpacing,
    },
    children: [
      {
        id: 'sourceSchemaBlock',
        layoutOptions: sourceSchemaLayoutOptions,
        children: [
          ...Object.values(flattenedSourceSchema).map((srcNode) => ({
            id: addSourceReactFlowPrefix(srcNode.key),
            width: schemaNodeCardDefaultWidth,
            height: schemaNodeCardHeight,
          })),
          // NOTE: Dummy nodes allow proper layouting when no real nodes exist yet
          { id: 'srcDummyNode', width: schemaNodeCardDefaultWidth, height: schemaNodeCardHeight },
        ],
      },
      {
        id: 'functionsBlock',
        layoutOptions: functionsLayoutOptions,
        children: [
          ...Object.keys(functionNodes).map((fnNodeKey) => ({
            id: fnNodeKey,
            width: functionNodeCardSize,
            height: functionNodeCardSize,
          })),
          { id: 'fnDummyNode', width: functionNodeCardSize, height: functionNodeCardSize },
        ],
        // Only function<->function edges
        edges: interFunctionEdges,
      },
      {
        id: 'targetSchemaBlock',
        layoutOptions: targetSchemaLayoutOptions,
        children: [
          ...Object.values(flattenedTargetSchema).map((childNode) => ({
            id: addTargetReactFlowPrefix(childNode.key),
            width: schemaNodeCardDefaultWidth,
            height: schemaNodeCardHeight,
          })),
          // NOTE: Dummy nodes allow proper layouting when no real nodes exist yet
          { id: 'tgtDummyNode', width: schemaNodeCardDefaultWidth, height: schemaNodeCardHeight },
        ],
      },
    ],
    edges: interBlockEdges,
  };

  return elkTree;
};

/* eslint-disable no-param-reassign */
const applyCustomLayout = async (graph: ElkNode): Promise<ElkNode> => {
  const schemaNodeCardVGap = 8;
  const schemaToFunctionsHGap = 24;
  const xInterval = 32;
  // const yInterval = 32;

  const getSchemaNodeYPos = (nodeIdx: number) => nodeIdx * (schemaNodeCardHeight + (nodeIdx === 0 ? 0 : schemaNodeCardVGap));

  if (
    graph.children &&
    graph.children[0] &&
    graph.children[0].children &&
    graph.children[1] &&
    graph.children[1].children &&
    graph.children[2] &&
    graph.children[2].children
  ) {
    // Misc setup
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
    const fnStartX = srcSchemaStartX + schemaNodeCardDefaultWidth + schemaToFunctionsHGap;
    let farthestRightFnNodeXPos = fnStartX;
    const nextAvailableToolbarSpot = [0, 0]; // Grid representation (one node slot == 1x1)

    const calculateFnNodePosition = (fnNode: ElkNode) => {
      // Duplicate check above because TypeScript!
      if (
        !(
          graph.children &&
          graph.children[0] &&
          graph.children[0].children &&
          graph.children[1] &&
          graph.children[1].children &&
          graph.children[2] &&
          graph.children[2].children
        )
      ) {
        return;
      }

      // Compile positions of any inputs and number of outputs
      const compiledInputPositions: number[][] = [];
      let numOutputs = 0;
      if (graph.edges) {
        // TODO: Combine the two if statement functionalities below into a single function
        graph.edges.forEach((edge) => {
          if (edge.sources.includes(fnNode.id)) {
            numOutputs += 1;
          } else if (edge.targets.includes(fnNode.id)) {
            // Duplicate check above because TypeScript!
            if (
              !(
                graph.children &&
                graph.children[0] &&
                graph.children[0].children &&
                graph.children[1] &&
                graph.children[1].children &&
                graph.children[2] &&
                graph.children[2].children
              )
            ) {
              return;
            }
            // Find input node, and get or calculate its position
            const inputNode = [...graph.children[0].children, ...graph.children[1].children].find(
              (srcSchemaOrFnNode) => srcSchemaOrFnNode.id === edge.sources[0]
            );

            if (inputNode) {
              if (!inputNode.x || !inputNode.y) {
                // Should recursively make sure all input chains are or get calculated
                calculateFnNodePosition(inputNode);
              }

              compiledInputPositions.push([inputNode.x as number, inputNode.y as number]);
            }
          }
        });
      }

      if (graph.children[1].edges) {
        graph.children[1].edges.forEach((edge) => {
          if (edge.sources.includes(fnNode.id)) {
            numOutputs += 1;
          } else if (edge.targets.includes(fnNode.id)) {
            // Duplicate check above because TypeScript!
            if (
              !(
                graph.children &&
                graph.children[0] &&
                graph.children[0].children &&
                graph.children[1] &&
                graph.children[1].children &&
                graph.children[2] &&
                graph.children[2].children
              )
            ) {
              return;
            }
            // Find input node, and get or calculate its position
            const inputNode = graph.children[1].children.find((inputFnNode) => inputFnNode.id === edge.sources[0]);

            if (inputNode) {
              if (!inputNode.x || !inputNode.y) {
                // Should recursively make sure all input chains are or get calculated
                calculateFnNodePosition(inputNode);
              }

              compiledInputPositions.push([inputNode.x as number, inputNode.y as number]);
            }
          }
        });
      }

      // Initial calculation
      let fnNodeXPos: number | undefined = undefined;
      let fnNodeYPos: number | undefined = undefined;

      if (compiledInputPositions.length === 0) {
        if (numOutputs === 0) {
          // Completely unconnected nodes -> place in next toolbar slot
          fnNodeXPos = nextAvailableToolbarSpot[0] * functionNodeCardSize;
          fnNodeYPos = nextAvailableToolbarSpot[1] * functionNodeCardSize;

          nextAvailableToolbarSpot[1] = nextAvailableToolbarSpot[0] === 8 ? nextAvailableToolbarSpot[1] + 1 : nextAvailableToolbarSpot[1];
          nextAvailableToolbarSpot[0] = nextAvailableToolbarSpot[0] === 8 ? 0 : nextAvailableToolbarSpot[0] + 1;
        } else {
          // xPos == xInterval left of its (closest?) output
          // yPos == same as output (or middle of multiple outputs)
          // Don't do anything here? Once we come across its output node, that should come back and place this
        }
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
      fnNode.x = fnNodeXPos;
      fnNode.y = fnNodeYPos;

      // TODO: Adjust for expanded vs simple node card sizing (for consistent precision instead of guessing)
      if (fnNode.x && fnNode.x > farthestRightFnNodeXPos) {
        farthestRightFnNodeXPos = fnNode.x;
      }
    };

    graph.children[1].children.forEach((fnNode) => {
      calculateFnNodePosition(fnNode);
    });

    // Target schema node positioning
    const tgtSchemaStartX = farthestRightFnNodeXPos + functionNodeCardSize + schemaToFunctionsHGap;
    graph.children[2].children.forEach((tgtSchemaNode, idx) => {
      tgtSchemaNode.x = tgtSchemaStartX;
      tgtSchemaNode.y = getSchemaNodeYPos(idx);
    });
  }

  return Promise.resolve(graph);
};

export const applyElkLayout = async (graph: ElkNode, useCustomLayouting?: boolean): Promise<ElkNode> => {
  if (!useCustomLayouting) {
    return elk.layout(graph);
  } else {
    return applyCustomLayout(graph);
  }
};
