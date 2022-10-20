import type { FunctionCardProps } from '../components/nodeCard/FunctionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { childTargetNodeCardIndent } from '../constants/NodeConstants';
import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { flattenInputs, isConnectionUnit } from './Connection.Utils';
import { getFunctionBrandingForCategory } from './Function.Utils';
import { applyElkLayout, convertDataMapNodesToElkGraph } from './Layout.Utils';
import { isLeafNode } from './Schema.Utils';
import { guid } from '@microsoft-logic-apps/utils';
import type { ElkNode } from 'elkjs';
import { useEffect, useState } from 'react';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'reactflow';
import { Position } from 'reactflow';

export const useLayout = (
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  currentTargetNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary,
  selectedItemKey: string | undefined
): [ReactFlowNode[], ReactFlowEdge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);

  // Nodes
  useEffect(() => {
    if (currentTargetNode) {
      // Sort source schema nodes according to their order in the schema
      const combinedSourceNodes = [
        ...connectedSourceNodes,
        ...currentlySelectedSourceNodes.filter((selectedNode) => {
          const existingNode = connectedSourceNodes.find((currentNode) => currentNode.key === selectedNode.key);
          return !existingNode;
        }),
      ];
      const flattenedKeys = Object.values(allSourceNodes).map((sourceNode) => sourceNode.key);
      combinedSourceNodes.sort((nodeA, nodeB) =>
        nodeA.pathToRoot.length !== nodeB.pathToRoot.length
          ? nodeA.pathToRoot.length - nodeB.pathToRoot.length
          : flattenedKeys.indexOf(nodeA.key) - flattenedKeys.indexOf(nodeB.key)
      );

      // Build ELK node/edges data
      const elkTreeFromCanvasNodes = convertDataMapNodesToElkGraph(combinedSourceNodes, allFunctionNodes, currentTargetNode, connections);

      // Apply ELK layout
      applyElkLayout(elkTreeFromCanvasNodes).then((layoutedElkTree) => {
        // Convert newly-calculated ELK node data to React Flow nodes
        // NOTE: edges were only used to aid ELK in layout calculation, ReactFlow still handles creating/routing/etc them
        setReactFlowNodes(convertToReactFlowNodes(layoutedElkTree, combinedSourceNodes, allFunctionNodes, currentTargetNode, connections));
      });
    } else {
      setReactFlowNodes([]);
    }
  }, [currentTargetNode, currentlySelectedSourceNodes, connectedSourceNodes, allSourceNodes, allFunctionNodes, connections]);

  // Edges
  useEffect(() => {
    setReactFlowEdges(convertToReactFlowEdges(connections, selectedItemKey));
  }, [connections, selectedItemKey]);

  return [reactFlowNodes, reactFlowEdges];
};

export const convertToReactFlowNodes = (
  elkTree: ElkNode,
  combinedSourceNodes: SchemaNodeExtended[],
  allFunctionNodes: FunctionDictionary,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<CardProps>[] => {
  const reactFlowNodes: ReactFlowNode<CardProps>[] = [];

  if (!elkTree.children || elkTree.children.length !== 3) {
    console.error('Layout error: outputted root elkTree does not have necessary children');
    return reactFlowNodes;
  }

  reactFlowNodes.push(
    ...convertSourceToReactFlowParentAndChildNodes(
      elkTree.children[0], // sourceSchemaBlock
      combinedSourceNodes,
      connections
    ),
    ...convertTargetToReactFlowParentAndChildNodes(elkTree.children[2], targetSchemaNode, connections),
    ...convertFunctionsToReactFlowParentAndChildNodes(elkTree.children[1], allFunctionNodes)
  );

  return reactFlowNodes;
};

const convertSourceToReactFlowParentAndChildNodes = (
  sourceSchemaElkTree: ElkNode,
  combinedSourceNodes: SchemaNodeExtended[],
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

  if (!sourceSchemaElkTree.children) {
    console.error('Layout error: sourceSchemaElkTree missing children');
    return reactFlowNodes;
  }

  combinedSourceNodes.forEach((sourceNode) => {
    const nodeReactFlowId = addSourceReactFlowPrefix(sourceNode.key);
    const relatedConnections = getConnectionsForNode(connections, sourceNode.key, SchemaTypes.Source);

    const elkNode = sourceSchemaElkTree.children?.find((node) => node.id === nodeReactFlowId);
    if (!elkNode || !elkNode.x || !elkNode.y || !sourceSchemaElkTree.x || !sourceSchemaElkTree.y) {
      console.error('Layout error: sourceSchema ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: nodeReactFlowId,
      data: {
        schemaNode: sourceNode,
        schemaType: SchemaTypes.Source,
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
        x: sourceSchemaElkTree.x + elkNode.x,
        y: sourceSchemaElkTree.y + elkNode.y,
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
  return convertToReactFlowParentAndChildNodes(targetSchemaElkTree, targetSchemaNode, SchemaTypes.Target, true, connections);
};

export const convertToReactFlowParentAndChildNodes = (
  elkTree: ElkNode,
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaTypes,
  displayTargets: boolean,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const relatedConnections = getConnectionsForNode(connections, parentSchemaNode.key, SchemaTypes.Source);

  const parentNodeReactFlowId = addReactFlowPrefix(parentSchemaNode.key, schemaType);
  const parentElkNode = elkTree.children?.find((node) => node.id === parentNodeReactFlowId);
  if (!parentElkNode || !parentElkNode.x || !parentElkNode.y || !elkTree.x || !elkTree.y) {
    console.error('Layout error: Schema parent ElkNode not found, or missing x/y');
    return reactFlowNodes;
  }

  reactFlowNodes.push({
    id: parentNodeReactFlowId,
    data: {
      schemaNode: parentSchemaNode,
      schemaType,
      displayHandle: displayTargets,
      displayChevron: false,
      isLeaf: false,
      isChild: false,
      disabled: false,
      error: false,
      relatedConnections: relatedConnections,
    },
    type: ReactFlowNodeType.SchemaNode,
    targetPosition: !displayTargets ? undefined : SchemaTypes.Source ? Position.Right : Position.Left,
    position: {
      x: elkTree.x + parentElkNode.x,
      y: elkTree.y + parentElkNode.y,
    },
  });

  parentSchemaNode.children?.forEach((childNode) => {
    const childNodeReactFlowId = addReactFlowPrefix(childNode.key, schemaType);
    const childElkNode = elkTree.children?.find((node) => node.id === childNodeReactFlowId);
    if (!childElkNode || !childElkNode.x || !childElkNode.y || !elkTree.x || !elkTree.y) {
      console.error('Layout error: Schema child ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: addReactFlowPrefix(childNode.key, schemaType),
      data: {
        schemaNode: childNode,
        schemaType,
        displayHandle: displayTargets,
        displayChevron: true,
        isLeaf: isLeafNode(childNode),
        isChild: true,
        disabled: false,
        error: false,
        relatedConnections: [],
      },
      type: ReactFlowNodeType.SchemaNode,
      targetPosition: !displayTargets ? undefined : SchemaTypes.Source ? Position.Right : Position.Left,
      position: {
        x: elkTree.x + childElkNode.x + childTargetNodeCardIndent,
        y: elkTree.y + childElkNode.y,
      },
    });
  });

  return reactFlowNodes;
};

const convertFunctionsToReactFlowParentAndChildNodes = (
  functionsElkTree: ElkNode,
  allFunctionNodes: FunctionDictionary
): ReactFlowNode<FunctionCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<FunctionCardProps>[] = [];

  Object.entries(allFunctionNodes).forEach(([functionKey, functionNode]) => {
    const elkNode = functionsElkTree.children?.find((node) => node.id === functionKey);
    if (!elkNode || !elkNode.x || !elkNode.y || !functionsElkTree.x || !functionsElkTree.y) {
      console.error('Layout error: Function ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: functionKey,
      data: {
        functionName: functionNode.functionName,
        displayHandle: true,
        maxNumberOfInputs: functionNode.maxNumberOfInputs,
        inputs: functionNode.inputs,
        functionBranding: getFunctionBrandingForCategory(functionNode.category),
        disabled: false,
        error: false,
      },
      type: ReactFlowNodeType.FunctionNode,
      sourcePosition: Position.Right,
      position: {
        x: functionsElkTree.x + elkNode.x,
        y: functionsElkTree.y + elkNode.y,
      },
    });
  });

  return reactFlowNodes;
};

export const convertToReactFlowEdges = (connections: ConnectionDictionary, selectedItemKey: string | undefined): ReactFlowEdge[] => {
  return Object.values(connections).flatMap((connection) => {
    const nodeInputs = flattenInputs(connection.inputs).filter(isConnectionUnit);

    return nodeInputs.map((input) => {
      const id = createReactFlowConnectionId(input.reactFlowKey, connection.self.reactFlowKey);
      return {
        id,
        source: input.reactFlowKey,
        target: connection.self.reactFlowKey,
        type: ReactFlowEdgeType.ConnectionEdge,
        selected: selectedItemKey === id,
      };
    });
  });
};

const getConnectionsForNode = (connections: ConnectionDictionary, nodeKey: string, nodeType: SchemaTypes): Connection[] => {
  const relatedConnections: Connection[] = [];
  Object.keys(connections).forEach((key) => {
    if ((nodeType === SchemaTypes.Source && key.startsWith(nodeKey)) || (nodeType === SchemaTypes.Target && key.endsWith(nodeKey))) {
      relatedConnections.push(connections[key]);
    }
  });
  return relatedConnections;
};

export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;

export const createReactFlowConnectionId = (sourceId: string, targetId: string): string => `${sourceId}-to-${targetId}`;

export const addReactFlowPrefix = (key: string, type: SchemaTypes) => `${type}-${key}`;
export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;

export const getSourceIdFromReactFlowId = (reactFlowId: string): string => reactFlowId.split('-to-')[0];

export const getDestinationIdFromReactFlowId = (reactFlowId: string): string => reactFlowId.split('-to-')[1];
