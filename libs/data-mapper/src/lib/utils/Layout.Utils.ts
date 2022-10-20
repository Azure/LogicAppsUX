import { schemaNodeCardHeight, schemaNodeCardWidth, functionNodeCardSize } from '../constants/NodeConstants';
import type { SchemaNodeExtended } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from './ReactFlow.Util';
import ELK from 'elkjs/lib/elk.bundled';
import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled';

const elk = new ELK();

const defaultTreeLayoutOptions: Record<string, string> = {
  alignment: 'LEFT', // General layout settings
  'elk.direction': 'RIGHT',
  algorithm: 'layered',
  hierarchyHandling: 'INCLUDE_CHILDREN',
  'layering.strategy': 'INTERACTIVE',
  'spacing.nodeNodeBetweenLayers': '300.0', // Spacing between node groups (Source schema/Functions/Target schema)
  'spacing.edgeNodeBetweenLayers': '128.0',
  'crossingMinimization.semiInteractive': 'true', // Settings related to node ordering (when attempting to minimize edge crossing)
  'considerModelOrder.strategy': 'NODES_AND_EDGES',
  'partitioning.activate': 'true', // Allows blocks/node-groups to be forced into specific "slots"
};

const sourceSchemaLayoutOptions: Record<string, string> = {
  'partitioning.partition': '0',
  'crossingMinimization.forceNodeModelOrder': 'true', // Ensures that node order is maintained (which we want for schema nodes (not functions))
};

const functionsLayoutOptions: Record<string, string> = {
  'partitioning.partition': '1',
};

const targetSchemaLayoutOptions: Record<string, string> = {
  'partitioning.partition': '2',
  'crossingMinimization.forceNodeModelOrder': 'true',
};

export const convertDataMapNodesToElkGraph = (
  currentSourceNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  currentTargetNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ElkNode => {
  // NOTE: Sub-block edges[] only contain edges between nodes *within that block*
  // - the root edges[] will contain all multi-block edges (thus, src/tgt schemas should never have edges)
  let nextEdgeIndex = 0;
  const interFunctionEdges: ElkExtendedEdge[] = [];
  const interBlockEdges: ElkExtendedEdge[] = [];

  Object.values(connections).forEach((connection) => {
    // Categorize connections to function<->function and any others for elkTree creation below
    Object.values(connection.inputs).forEach((inputValueArray) => {
      inputValueArray.forEach((inputValue) => {
        if (isConnectionUnit(inputValue)) {
          const nextEdge = {
            id: `e${nextEdgeIndex}`,
            sources: [inputValue.reactFlowKey],
            targets: [connection.self.reactFlowKey],
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
        children: currentSourceNodes.map((srcNode) => ({
          id: addSourceReactFlowPrefix(srcNode.key),
          width: schemaNodeCardWidth,
          height: schemaNodeCardHeight,
        })),
      },
      {
        id: 'functionsBlock',
        layoutOptions: functionsLayoutOptions,
        children: Object.keys(currentFunctionNodes).map((fnNodeKey) => ({
          id: fnNodeKey,
          width: functionNodeCardSize,
          height: functionNodeCardSize,
        })),
        // Only function<->function edges
        edges: interFunctionEdges,
      },
      {
        id: 'targetSchemaBlock',
        layoutOptions: targetSchemaLayoutOptions,
        children: [
          { id: addTargetReactFlowPrefix(currentTargetNode.key), width: schemaNodeCardWidth, height: schemaNodeCardHeight },
          ...currentTargetNode.children.map((childNode) => ({
            id: addTargetReactFlowPrefix(childNode.key),
            width: schemaNodeCardWidth,
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
