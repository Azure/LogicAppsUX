import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import type { FunctionCardProps } from '../components/nodeCard/functionCard/FunctionCard';
import type { NodeToggledStateDictionary } from '../components/tree/TargetSchemaTreeItem';
import { childTargetNodeCardIndent, schemaNodeCardHeight, schemaNodeCardWidth } from '../constants/NodeConstants';
import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import type { SchemaNodeExtended, SourceSchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperty, SchemaType } from '../models/Schema';
import { getFunctionBrandingForCategory } from './Function.Utils';
import { applyElkLayout, convertDataMapNodesToElkGraph } from './Layout.Utils';
import { LogCategory, LogService } from './Logging.Utils';
import { isLeafNode } from './Schema.Utils';
import { guid } from '@microsoft/utils-logic-apps';
import type { ElkNode } from 'elkjs';
import { useEffect, useState } from 'react';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'reactflow';
import { Position } from 'reactflow';

export const overviewTgtSchemaX = 600;

interface SimplifiedElkEdge {
  srcRfId: string;
  tgtRfId: string;
  tgtPort?: string;
}

interface Size2D {
  width: number;
  height: number;
}

// Hidden dummy node placed at 0,0 (same as source schema block) to allow initial load fitView to center diagram
// NOTE: Not documented, but hidden nodes need a width/height to properly affect fitView when includeHiddenNodes option is true
const placeholderReactFlowNode: ReactFlowNode = {
  id: 'layouting-&-Placeholder',
  hidden: true,
  sourcePosition: Position.Right,
  data: null,
  width: schemaNodeCardWidth,
  height: 10,
  position: {
    x: 0,
    y: 0,
  },
};

export const useLayout = (
  currentSourceSchemaNodes: SourceSchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  currentTargetSchemaNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary,
  selectedItemKey: string | undefined,
  sourceSchemaOrdering: string[]
): [ReactFlowNode[], ReactFlowEdge[], Size2D] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);
  const [diagramSize, setDiagramSize] = useState<Size2D>({ width: 0, height: 0 });

  useEffect(() => {
    if (currentTargetSchemaNode) {
      // Sort source schema nodes according to their order in the schema
      const sortedSourceSchemaNodes = [...currentSourceSchemaNodes].sort(
        (nodeA, nodeB) => sourceSchemaOrdering.indexOf(nodeA.key) - sourceSchemaOrdering.indexOf(nodeB.key)
      );

      // Build ELK node/edges data
      const elkTreeFromCanvasNodes = convertDataMapNodesToElkGraph(
        sortedSourceSchemaNodes,
        currentFunctionNodes,
        currentTargetSchemaNode,
        connections
      );

      // Apply ELK layout
      applyElkLayout(elkTreeFromCanvasNodes)
        .then((layoutedElkTree) => {
          // Convert newly-calculated ELK node data to React Flow nodes + edges
          setReactFlowNodes([
            placeholderReactFlowNode,
            ...convertToReactFlowNodes(
              layoutedElkTree,
              sortedSourceSchemaNodes,
              currentFunctionNodes,
              currentTargetSchemaNode,
              connections
            ),
          ]);

          const simpleElkEdgeResults: SimplifiedElkEdge[] = [];

          if (layoutedElkTree.edges) {
            simpleElkEdgeResults.push(
              ...layoutedElkTree.edges.map((elkEdge) => {
                return {
                  srcRfId: elkEdge.sources[0],
                  tgtRfId: elkEdge.targets[0],
                  tgtPort: elkEdge.labels && elkEdge.labels.length > 0 ? elkEdge.labels[0].text : undefined,
                };
              })
            );
          }

          if (layoutedElkTree.children && layoutedElkTree.children.length === 3 && layoutedElkTree.children[1].edges) {
            simpleElkEdgeResults.push(
              ...layoutedElkTree.children[1].edges.map((elkEdge) => {
                return {
                  srcRfId: elkEdge.sources[0],
                  tgtRfId: elkEdge.targets[0],
                  tgtPort: elkEdge.labels && elkEdge.labels.length > 0 ? elkEdge.labels[0].text : undefined,
                };
              })
            );
          }

          setReactFlowEdges(convertToReactFlowEdges(simpleElkEdgeResults, selectedItemKey));

          // Calculate diagram size
          setDiagramSize({
            width: layoutedElkTree.width ?? 0,
            height: layoutedElkTree.height ?? 0,
          });
        })
        .catch((error) => {
          LogService.error(LogCategory.ReactFlowUtils, 'useEffect', {
            message: `Elk Layout Error: ${error}`,
          });
        });
    } else {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
      setDiagramSize({ width: 0, height: 0 });
    }
  }, [currentTargetSchemaNode, currentSourceSchemaNodes, currentFunctionNodes, connections, sourceSchemaOrdering, selectedItemKey]);

  return [reactFlowNodes, reactFlowEdges, diagramSize];
};

export const convertToReactFlowNodes = (
  elkTree: ElkNode,
  currentSourceSchemaNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<CardProps>[] => {
  if (!elkTree.children || elkTree.children.length !== 3) {
    LogService.error(LogCategory.ReactFlowUtils, 'convertToReactFlowNodes', {
      message: 'Layout error: outputted root elkTree does not have necessary children',
    });

    return [];
  }

  return [
    ...convertSourceToReactFlowParentAndChildNodes(
      elkTree.children[0], // sourceSchemaBlock
      currentSourceSchemaNodes,
      connections
    ),
    ...convertFunctionsToReactFlowParentAndChildNodes(elkTree.children[1], currentFunctionNodes),
    ...convertTargetToReactFlowParentAndChildNodes(elkTree.children[2], targetSchemaNode, connections),
  ];
};

const convertSourceToReactFlowParentAndChildNodes = (
  sourceSchemaElkTree: ElkNode,
  combinedSourceSchemaNodes: SchemaNodeExtended[],
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

  if (!sourceSchemaElkTree.children) {
    LogService.error(LogCategory.ReactFlowUtils, 'convertSourceToReactFlowParentAndChildNodes', {
      message: 'Layout error: sourceSchemaElkTree missing children',
    });

    return reactFlowNodes;
  }

  const sourceNodesCopy = [...combinedSourceSchemaNodes];
  sourceNodesCopy.filter((node) => node.nodeProperties.includes(SchemaNodeProperty.Repeating));
  const sourceKeySet: Set<string> = new Set();
  sourceNodesCopy.forEach((node) => sourceKeySet.add(node.key));
  const widthDict: Map<string, number> = new Map<string, number>();
  let maxSize = 200;
  const widthToIncrease = 24;
  combinedSourceSchemaNodes.forEach((srcNode) => {
    let srcWidth = 0;
    sourceKeySet.forEach((possibleParent) => {
      if (srcNode.key.includes(possibleParent) && possibleParent !== srcNode.key) {
        srcWidth = srcWidth + widthToIncrease;
      }
    });
    widthDict.set(srcNode.key, srcWidth);
    if (srcWidth > 72) {
      maxSize += widthToIncrease;
    }
  });

  combinedSourceSchemaNodes.forEach((srcNode) => {
    const nodeReactFlowId = addSourceReactFlowPrefix(srcNode.key);
    const relatedConnections = getConnectionsForNode(connections, srcNode.key, SchemaType.Source);

    const elkNode = sourceSchemaElkTree.children?.find((node) => node.id === nodeReactFlowId);
    if (!elkNode || !elkNode.x || !elkNode.y || !sourceSchemaElkTree.x || !sourceSchemaElkTree.y) {
      LogService.error(LogCategory.ReactFlowUtils, 'convertSourceToReactFlowParentAndChildNodes', {
        message: 'Layout error: sourceSchema ElkNode not found, or missing x/y',
        elkData: {
          elkNodeX: elkNode?.x,
          elkNodeY: elkNode?.y,
          sourceSchemaElkTreeX: sourceSchemaElkTree?.x,
          sourceSchemaElkTreeY: sourceSchemaElkTree?.y,
        },
      });

      return;
    }

    const dictWidth = widthDict.get(srcNode.key);
    const nodeWidth = dictWidth !== undefined ? dictWidth : 200;

    reactFlowNodes.push({
      id: nodeReactFlowId,
      zIndex: 101, // Just for schema nodes to render N-badge over edges
      data: {
        schemaNode: { ...srcNode, width: maxSize - nodeWidth },
        maxWidth: maxSize,
        schemaType: SchemaType.Source,
        displayHandle: true,
        displayChevron: true,
        isLeaf: true,
        isChild: false,
        disabled: false,
        error: false,
        relatedConnections: relatedConnections,
      },
      type: ReactFlowNodeType.SchemaNode,
      sourcePosition: Position.Right,
      position: {
        x: 0,
        y: elkNode.y,
      },
    });
  });

  return reactFlowNodes;
};

const convertTargetToReactFlowParentAndChildNodes = (
  targetSchemaElkTree: ElkNode,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  return convertToReactFlowParentAndChildNodes(targetSchemaElkTree, targetSchemaNode, SchemaType.Target, true, connections);
};

export const convertToReactFlowParentAndChildNodes = (
  elkTree: ElkNode,
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaType,
  displayTargets: boolean,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const relatedConnections = getConnectionsForNode(connections, parentSchemaNode.key, schemaType);

  const parentNodeReactFlowId = addReactFlowPrefix(parentSchemaNode.key, schemaType);
  const parentElkNode = elkTree.children?.find((node) => node.id === parentNodeReactFlowId);
  if (!parentElkNode || !parentElkNode.x || !parentElkNode.y || !elkTree.x || !elkTree.y) {
    LogService.error(LogCategory.ReactFlowUtils, 'convertToReactFlowParentAndChildNodes', {
      message: 'Layout error: Schema parent ElkNode not found, or missing x/y',
      elkData: {
        parentElkNodeX: parentElkNode?.x,
        parentElkNodeY: parentElkNode?.y,
        elkTreeX: elkTree?.x,
        elkTreeY: elkTree?.y,
      },
    });

    return reactFlowNodes;
  }

  reactFlowNodes.push({
    id: parentNodeReactFlowId,
    zIndex: 101, // Just for schema nodes to render N-badge over edges
    data: {
      schemaNode: parentSchemaNode,
      schemaType,
      displayHandle: !!displayTargets,
      displayChevron: false,
      isLeaf: false,
      isChild: false,
      disabled: false,
      error: false,
      relatedConnections: relatedConnections,
    },
    type: ReactFlowNodeType.SchemaNode,
    targetPosition: !displayTargets ? undefined : schemaType === SchemaType.Source ? Position.Right : Position.Left,
    position: {
      x: elkTree.x + parentElkNode.x,
      y: parentElkNode.y,
    },
  });

  parentSchemaNode.children?.forEach((childNode) => {
    const childNodeReactFlowId = addReactFlowPrefix(childNode.key, schemaType);
    const childElkNode = elkTree.children?.find((node) => node.id === childNodeReactFlowId);
    if (!childElkNode || !childElkNode.x || !childElkNode.y || !elkTree.x || !elkTree.y) {
      LogService.error(LogCategory.ReactFlowUtils, 'convertToReactFlowParentAndChildNodes', {
        message: 'Layout error: Schema child ElkNode not found, or missing x/y',
        elkData: {
          childElkNodeX: childElkNode?.x,
          childElkNodeY: childElkNode?.y,
          elkTreeX: elkTree?.x,
          elkTreeY: elkTree?.y,
        },
      });

      return;
    }

    reactFlowNodes.push({
      id: childNodeReactFlowId,
      zIndex: 101, // Just for schema nodes to render N-badge over edges
      data: {
        schemaNode: childNode,
        schemaType,
        displayHandle: !!displayTargets,
        displayChevron: true,
        isLeaf: isLeafNode(childNode),
        isChild: true,
        disabled: false,
        error: false,
        relatedConnections: [],
      },
      type: ReactFlowNodeType.SchemaNode,
      targetPosition: !displayTargets ? undefined : schemaType === SchemaType.Source ? Position.Right : Position.Left,
      position: {
        x: elkTree.x + childElkNode.x + childTargetNodeCardIndent,
        y: childElkNode.y,
      },
    });
  });

  return reactFlowNodes;
};

const convertFunctionsToReactFlowParentAndChildNodes = (
  functionsElkTree: ElkNode,
  currentFunctionNodes: FunctionDictionary
): ReactFlowNode<FunctionCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<FunctionCardProps>[] = [];

  Object.entries(currentFunctionNodes).forEach(([functionKey, fnNode], idx) => {
    const elkNode = functionsElkTree.children?.find((node) => node.id === functionKey);
    if (!elkNode || !elkNode.x || !elkNode.y || !functionsElkTree.x || !functionsElkTree.y) {
      LogService.error(LogCategory.ReactFlowUtils, 'convertToReactFlowParentAndChildNodes', {
        message: 'Layout error: Function ElkNode not found, or missing x/y',
        elkData: {
          elkNodeX: elkNode?.x,
          elkNodeY: elkNode?.y,
          functionsElkTreeX: functionsElkTree?.x,
          functionsElkTreeY: functionsElkTree?.y,
        },
      });

      return;
    }

    reactFlowNodes.push({
      id: functionKey,
      data: {
        functionData: fnNode,
        displayHandle: true,
        functionBranding: getFunctionBrandingForCategory(fnNode.category),
        disabled: false,
        error: false,
        dataTestId: `${fnNode.key}-${idx}`, // For e2e testing
      },
      type: ReactFlowNodeType.FunctionNode,
      sourcePosition: Position.Right,
      position: {
        x: functionsElkTree.x + elkNode.x,
        y: elkNode.y,
      },
    });
  });

  return reactFlowNodes;
};

export const convertToReactFlowEdges = (elkEdges: SimplifiedElkEdge[], selectedItemKey: string | undefined): ReactFlowEdge[] => {
  // NOTE: All validation (Ex: making sure edges given to ELK are actively on canvas) is handled pre-elk-layouting
  return elkEdges
    .map<ReactFlowEdge>((elkEdge) => {
      // Sort the resulting edges so that the selected edge is rendered last and thus on top of all other edges
      const id = createReactFlowConnectionId(elkEdge.srcRfId, elkEdge.tgtRfId);
      return {
        id,
        source: elkEdge.srcRfId,
        target: elkEdge.tgtRfId,
        targetHandle: elkEdge.tgtPort,
        type: ReactFlowEdgeType.ConnectionEdge,
        selected: selectedItemKey === id,
      };
    })
    .sort((a, b) => (!a.selected && b.selected ? -1 : a.selected && b.selected ? 0 : 1));
};

export const useOverviewLayout = (
  srcSchemaTreeRoot?: SchemaNodeExtended,
  tgtSchemaTreeRoot?: SchemaNodeExtended,
  tgtSchemaToggledStatesDictionary?: NodeToggledStateDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode<SchemaCardProps>[]>([]);

  useEffect(() => {
    const newReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

    const baseSchemaNodeData = {
      displayHandle: false,
      disabled: false,
      error: false,
      relatedConnections: [],
    };

    // Dummy source schema node
    newReactFlowNodes.push({ ...placeholderReactFlowNode });

    // Source schema nodes
    if (srcSchemaTreeRoot) {
      const baseSrcSchemaNodeData = {
        ...baseSchemaNodeData,
        schemaType: SchemaType.Source,
        displayChevron: false,
      };

      newReactFlowNodes.push({
        id: addSourceReactFlowPrefix(srcSchemaTreeRoot.key),
        data: {
          ...baseSrcSchemaNodeData,
          schemaNode: srcSchemaTreeRoot,
          isLeaf: false,
          isChild: false,
        },
        type: ReactFlowNodeType.SchemaNode,
        position: {
          x: 0,
          y: 0,
        },
      });

      srcSchemaTreeRoot.children?.forEach((childNode, idx) => {
        newReactFlowNodes.push({
          id: addSourceReactFlowPrefix(childNode.key),
          data: {
            ...baseSrcSchemaNodeData,
            schemaNode: childNode,
            isLeaf: isLeafNode(childNode),
            isChild: true,
          },
          type: ReactFlowNodeType.SchemaNode,
          position: {
            x: childTargetNodeCardIndent,
            y: (idx + 1) * (schemaNodeCardHeight + 10),
          },
        });
      });
    }

    // Dummy target schema node
    newReactFlowNodes.push({ ...placeholderReactFlowNode, position: { x: overviewTgtSchemaX, y: 0 }, id: 'layouting-&-Placeholder-Tgt' });

    // Target schema nodes
    if (tgtSchemaTreeRoot) {
      const baseTgtSchemaNodeData = {
        ...baseSchemaNodeData,
        schemaType: SchemaType.Target,
        displayChevron: true,
      };

      newReactFlowNodes.push({
        id: addTargetReactFlowPrefix(tgtSchemaTreeRoot.key),
        data: {
          ...baseTgtSchemaNodeData,
          schemaNode: tgtSchemaTreeRoot,
          isLeaf: false,
          isChild: false,
          connectionStatus: tgtSchemaToggledStatesDictionary ? tgtSchemaToggledStatesDictionary[tgtSchemaTreeRoot.key] : undefined,
        },
        type: ReactFlowNodeType.SchemaNode,
        position: {
          x: overviewTgtSchemaX,
          y: 0,
        },
      });

      tgtSchemaTreeRoot.children?.forEach((childNode, idx) => {
        newReactFlowNodes.push({
          id: addTargetReactFlowPrefix(childNode.key),
          data: {
            ...baseTgtSchemaNodeData,
            schemaNode: childNode,
            isLeaf: isLeafNode(childNode),
            isChild: true,
            connectionStatus: tgtSchemaToggledStatesDictionary ? tgtSchemaToggledStatesDictionary[childNode.key] : undefined,
          },
          type: ReactFlowNodeType.SchemaNode,
          position: {
            x: overviewTgtSchemaX + childTargetNodeCardIndent,
            y: (idx + 1) * (schemaNodeCardHeight + 10),
          },
        });
      });
    }

    setReactFlowNodes(newReactFlowNodes);
  }, [srcSchemaTreeRoot, tgtSchemaTreeRoot, tgtSchemaToggledStatesDictionary]);

  return reactFlowNodes;
};

const getConnectionsForNode = (connections: ConnectionDictionary, nodeKey: string, nodeType: SchemaType): Connection[] => {
  const relatedConnections: Connection[] = [];
  Object.keys(connections).forEach((key) => {
    if ((nodeType === SchemaType.Source && key.startsWith(nodeKey)) || (nodeType === SchemaType.Target && key.endsWith(nodeKey))) {
      relatedConnections.push(connections[key]);
    }
  });
  return relatedConnections;
};

export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;

export const addReactFlowPrefix = (key: string, type: SchemaType) => `${type}-${key}`;
export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;

export const reactFlowConnectionIdSeparator = '-to-';
export const createReactFlowConnectionId = (sourceId: string, targetId: string): string =>
  `${sourceId}${reactFlowConnectionIdSeparator}${targetId}`;
export const getSourceIdFromReactFlowConnectionId = (reactFlowId: string): string => reactFlowId.split(reactFlowConnectionIdSeparator)[0];
export const getDestinationIdFromReactFlowConnectionId = (reactFlowId: string): string =>
  reactFlowId.split(reactFlowConnectionIdSeparator)[1];
