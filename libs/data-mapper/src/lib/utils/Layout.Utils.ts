import { functionNodeCardSize, schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../constants/NodeConstants';
import type { SchemaNodeExtended } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { generateInputHandleId, isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';

const elk = new ELK();

const defaultTreeLayoutOptions: Record<string, string> = {
  // General layout settings
  direction: 'RIGHT',
  algorithm: 'layered',
  'layering.strategy': 'INTERACTIVE',
  hierarchyHandling: 'INCLUDE_CHILDREN',
  'partitioning.activate': 'true', // Allows blocks/node-groups to be forced into specific "slots"
  'edge.thickness': '8.0',
  'spacing.nodeNodeBetweenLayers': '120.0', // Spacing between node groups (Source schema/Functions/Target schema)
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
  connections: ConnectionDictionary
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
    layoutOptions: defaultTreeLayoutOptions,
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

export const applyElkLayout = async (graph: ElkNode) => {
  return elk.layout(graph);
};
