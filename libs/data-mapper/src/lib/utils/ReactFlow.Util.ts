import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import type { FunctionCardProps } from '../components/nodeCard/functionCard/FunctionCard';
import type { NodeToggledStateDictionary } from '../components/tree/TargetSchemaTreeItem';
import {
  childTargetNodeCardIndent,
  schemaNodeCardDefaultWidth,
  schemaNodeCardHeight,
  schemaNodeCardWidthDifference,
} from '../constants/NodeConstants';
import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import type { SchemaNodeExtended } from '../models/Schema';
import { SchemaType } from '../models/Schema';
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
  width: schemaNodeCardDefaultWidth,
  height: 10,
  position: {
    x: 0,
    y: 0,
  },
};

export const useLayout = (
  currentSourceSchemaNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
  currentTargetSchemaNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary,
  selectedItemKey: string | undefined,
  sourceSchemaOrdering: string[],
  useExpandedFunctionCards: boolean
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
        connections,
        useExpandedFunctionCards
      );

      // Apply ELK layout
      applyElkLayout(elkTreeFromCanvasNodes)
        .then((computedElkTree) => {
          // Convert newly-calculated ELK node data to React Flow nodes + edges
          setReactFlowNodes([
            placeholderReactFlowNode,
            ...convertToReactFlowNodes(
              computedElkTree,
              sortedSourceSchemaNodes,
              currentFunctionNodes,
              currentTargetSchemaNode,
              connections
            ),
          ]);

          const simpleElkEdgeResults: SimplifiedElkEdge[] = [];

          if (computedElkTree.edges) {
            simpleElkEdgeResults.push(
              ...computedElkTree.edges.map((elkEdge) => {
                return {
                  srcRfId: elkEdge.sources[0],
                  tgtRfId: elkEdge.targets[0],
                  tgtPort: elkEdge.labels && elkEdge.labels.length > 0 ? elkEdge.labels[0].text : undefined,
                };
              })
            );
          }

          if (computedElkTree.children && computedElkTree.children.length === 3 && computedElkTree.children[1].edges) {
            simpleElkEdgeResults.push(
              ...computedElkTree.children[1].edges.map((elkEdge) => {
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
            width: computedElkTree.width ?? 0,
            height: computedElkTree.height ?? 0,
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
  }, [
    currentTargetSchemaNode,
    currentSourceSchemaNodes,
    currentFunctionNodes,
    connections,
    sourceSchemaOrdering,
    selectedItemKey,
    useExpandedFunctionCards,
  ]);

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
    ...convertSourceSchemaToReactFlowNodes(elkTree.children[0], currentSourceSchemaNodes, connections),
    ...convertFunctionsToReactFlowParentAndChildNodes(elkTree.children[1], currentFunctionNodes),
    ...convertTargetSchemaToReactFlowNodes(elkTree.children[2], targetSchemaNode, connections),
  ];
};

const convertSourceSchemaToReactFlowNodes = (
  sourceSchemaElkTree: ElkNode,
  combinedSourceSchemaNodes: SchemaNodeExtended[],
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  return convertSchemaToReactFlowNodes(sourceSchemaElkTree, combinedSourceSchemaNodes, SchemaType.Source, connections);
};

const convertTargetSchemaToReactFlowNodes = (
  targetSchemaElkTree: ElkNode,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  return convertSchemaToReactFlowNodes(
    targetSchemaElkTree,
    [targetSchemaNode, ...targetSchemaNode.children],
    SchemaType.Target,
    connections
  );
};

export const convertSchemaToReactFlowNodes = (
  elkTree: ElkNode,
  schemaNodes: SchemaNodeExtended[],
  schemaType: SchemaType,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const isSourceSchema = schemaType === SchemaType.Source;
  const depthArray = nodeArrayDepth(schemaNodes);
  const maxLocalDepth = depthArray.length;

  schemaNodes.forEach((schemaNode, index) => {
    const relatedConnections = getConnectionsForNode(connections, schemaNode.key, schemaType);
    const reactFlowId = addReactFlowPrefix(schemaNode.key, schemaType);
    const curDepth = depthArray.indexOf(schemaNode.pathToRoot.length);

    const elkNode = elkTree.children?.find((node) => node.id === reactFlowId);
    if (!elkNode || !elkNode.x || !elkNode.y || !elkTree.x || !elkTree.y) {
      LogService.error(LogCategory.ReactFlowUtils, 'convertToReactFlowNodes', {
        message: 'Layout error: ElkNode not found, or missing x/y',
        schemaType,
        elkData: {
          elkNodeX: elkNode?.x,
          elkNodeY: elkNode?.y,
          elkTreeX: elkTree?.x,
          elkTreeY: elkTree?.y,
        },
      });

      return;
    }

    reactFlowNodes.push({
      id: reactFlowId,
      zIndex: 101, // Just for schema nodes to render N-badge over edges
      data: {
        schemaNode,
        schemaType,
        displayHandle: true,
        displayChevron: !isSourceSchema && index !== 0, // The first target node is the parent
        isLeaf: isLeafNode(schemaNode),
        width: calculateWidth(curDepth, maxLocalDepth),
        disabled: false,
        error: false,
        relatedConnections: relatedConnections,
      },
      type: ReactFlowNodeType.SchemaNode,
      targetPosition: isSourceSchema ? Position.Right : Position.Left,
      position: {
        x: elkTree.x + elkNode.x + curDepth * childTargetNodeCardIndent,
        y: elkNode.y,
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
    const sourceReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
    const targetReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

    // Dummy source schema node
    sourceReactFlowNodes.push({ ...placeholderReactFlowNode });

    // Source schema nodes
    if (srcSchemaTreeRoot) {
      addChildNodesForOverview(srcSchemaTreeRoot, 0, 1, sourceReactFlowNodes, true, !!srcSchemaTreeRoot, 1);
    }

    // Dummy target schema node
    targetReactFlowNodes.push({
      ...placeholderReactFlowNode,
      position: { x: overviewTgtSchemaX, y: 0 },
      id: 'layouting-&-Placeholder-Tgt',
    });

    // Target schema nodes
    if (tgtSchemaTreeRoot) {
      addChildNodesForOverview(tgtSchemaTreeRoot, 0, 1, targetReactFlowNodes, false, !!srcSchemaTreeRoot, 1);
    }

    setReactFlowNodes([...sourceReactFlowNodes, ...targetReactFlowNodes]);
  }, [srcSchemaTreeRoot, tgtSchemaTreeRoot, tgtSchemaToggledStatesDictionary]);

  return reactFlowNodes;
};

export const useWholeViewLayout = (
  srcSchemaTreeRoot: SchemaNodeExtended | undefined,
  tgtSchemaTreeRoot: SchemaNodeExtended | undefined,
  tgtSchemaToggledStatesDictionary?: NodeToggledStateDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode<SchemaCardProps>[]>([]);

  useEffect(() => {
    const sourceReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
    const targetReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

    // Dummy source schema node
    sourceReactFlowNodes.push({ ...placeholderReactFlowNode });

    // Source schema nodes
    if (srcSchemaTreeRoot) {
      const sourceDepth = nodeTreeDepth(srcSchemaTreeRoot);
      addChildNodesForOverview(srcSchemaTreeRoot, 0, sourceDepth, sourceReactFlowNodes, true, !!srcSchemaTreeRoot);
    }

    // Dummy target schema node
    targetReactFlowNodes.push({
      ...placeholderReactFlowNode,
      position: { x: overviewTgtSchemaX, y: 0 },
      id: 'layouting-&-Placeholder-Tgt',
    });

    // Target schema nodes
    if (tgtSchemaTreeRoot) {
      const targetDepth = nodeTreeDepth(tgtSchemaTreeRoot);
      addChildNodesForOverview(tgtSchemaTreeRoot, 0, targetDepth, targetReactFlowNodes, false, !!srcSchemaTreeRoot);
    }

    setReactFlowNodes([...sourceReactFlowNodes, ...targetReactFlowNodes]);
  }, [srcSchemaTreeRoot, tgtSchemaTreeRoot, tgtSchemaToggledStatesDictionary]);

  return reactFlowNodes;
};

const nodeTreeDepth = (node: SchemaNodeExtended): number => 1 + childrenDepth(node);
const childrenDepth = (node: SchemaNodeExtended): number => {
  return 1 + Math.max(-1, ...node.children.map(childrenDepth));
};

const nodeArrayDepth = (nodes: SchemaNodeExtended[]): number[] => {
  const depth: Set<number> = new Set();

  nodes.forEach((node) => {
    depth.add(node.pathToRoot.length);
  });

  return Array.from(depth);
};

const addChildNodesForOverview = (
  curNode: SchemaNodeExtended,
  curDepth: number,
  maxDepth: number,
  resultArray: ReactFlowNode<SchemaCardProps>[],
  isSourceSchema: boolean,
  sourceSchemaSpecified: boolean,
  generateToDepth?: number
): void => {
  const baseSchemaNodeData = {
    schemaType: isSourceSchema ? SchemaType.Source : SchemaType.Target,
    displayChevron: !isSourceSchema && sourceSchemaSpecified,
    displayHandle: false,
    disabled: false,
    error: false,
    relatedConnections: [],
  };

  resultArray.push({
    id: isSourceSchema ? addSourceReactFlowPrefix(curNode.key) : addTargetReactFlowPrefix(curNode.key),
    data: {
      ...baseSchemaNodeData,
      schemaNode: curNode,
      width: calculateWidth(curDepth, maxDepth),
      isLeaf: isLeafNode(curNode),
    },
    type: ReactFlowNodeType.SchemaNode,
    position: {
      x: (isSourceSchema ? 0 : overviewTgtSchemaX) + curDepth * schemaNodeCardWidthDifference,
      y: (resultArray.length - 1) * (schemaNodeCardHeight + 10),
    },
  });

  if (generateToDepth === undefined || curDepth < generateToDepth) {
    curNode.children.forEach((childNode) => {
      addChildNodesForOverview(childNode, curDepth + 1, maxDepth, resultArray, isSourceSchema, sourceSchemaSpecified, generateToDepth);
    });
  }
};

const calculateWidth = (curDepth: number, maxDepth: number): number => {
  const breakEvenDepth = 4;

  if (maxDepth < breakEvenDepth) {
    return schemaNodeCardDefaultWidth - curDepth * schemaNodeCardWidthDifference;
  }

  const curDepthDiff = maxDepth - curDepth;
  return schemaNodeCardDefaultWidth + (curDepthDiff - breakEvenDepth) * schemaNodeCardWidthDifference;
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
