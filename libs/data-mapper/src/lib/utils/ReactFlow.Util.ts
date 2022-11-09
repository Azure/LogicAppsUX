import type { FunctionCardProps } from '../components/nodeCard/FunctionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import type { NodeToggledStateDictionary } from '../components/tree/TargetSchemaTreeItem';
import { childTargetNodeCardIndent, schemaNodeCardHeight } from '../constants/NodeConstants';
import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaType } from '../models/Schema';
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
  currentSourceSchemaNodes: SchemaNodeExtended[],
  allSourceSchemaNodes: SchemaNodeDictionary,
  currentFunctionNodes: FunctionDictionary,
  currentTargetSchemaNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary,
  selectedItemKey: string | undefined
): [ReactFlowNode[], ReactFlowEdge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);

  // Nodes
  useEffect(() => {
    if (currentTargetSchemaNode) {
      // Sort source schema nodes according to their order in the schema
      const flattenedKeys = Object.values(allSourceSchemaNodes).map((node) => node.key);
      const sortedSourceSchemaNodes = [...currentSourceSchemaNodes].sort((nodeA, nodeB) =>
        nodeA.pathToRoot.length !== nodeB.pathToRoot.length
          ? nodeA.pathToRoot.length - nodeB.pathToRoot.length
          : flattenedKeys.indexOf(nodeA.key) - flattenedKeys.indexOf(nodeB.key)
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
          // Convert newly-calculated ELK node data to React Flow nodes
          // NOTE: edges were only used to aid ELK in layout calculation, ReactFlow still handles creating/routing/etc them
          setReactFlowNodes(
            convertToReactFlowNodes(layoutedElkTree, sortedSourceSchemaNodes, currentFunctionNodes, currentTargetSchemaNode, connections)
          );
        })
        .catch((error) => {
          console.error(`Elk Layout Error: ${error}`);
        });
    } else {
      setReactFlowNodes([]);
    }
  }, [currentTargetSchemaNode, currentSourceSchemaNodes, allSourceSchemaNodes, currentFunctionNodes, connections]);

  // Edges
  useEffect(() => {
    setReactFlowEdges(convertToReactFlowEdges(connections, selectedItemKey));
  }, [connections, selectedItemKey]);

  return [reactFlowNodes, reactFlowEdges];
};

export const convertToReactFlowNodes = (
  elkTree: ElkNode,
  currentSourceSchemaNodes: SchemaNodeExtended[],
  currentFunctionNodes: FunctionDictionary,
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
      currentSourceSchemaNodes,
      connections
    ),
    ...convertTargetToReactFlowParentAndChildNodes(elkTree.children[2], targetSchemaNode, connections),
    ...convertFunctionsToReactFlowParentAndChildNodes(elkTree.children[1], currentFunctionNodes)
  );

  return reactFlowNodes;
};

const convertSourceToReactFlowParentAndChildNodes = (
  sourceSchemaElkTree: ElkNode,
  combinedSourceSchemaNodes: SchemaNodeExtended[],
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

  if (!sourceSchemaElkTree.children) {
    console.error('Layout error: sourceSchemaElkTree missing children');
    return reactFlowNodes;
  }

  combinedSourceSchemaNodes.forEach((srcNode) => {
    const nodeReactFlowId = addSourceReactFlowPrefix(srcNode.key);
    const relatedConnections = getConnectionsForNode(connections, srcNode.key, SchemaType.Source);

    const elkNode = sourceSchemaElkTree.children?.find((node) => node.id === nodeReactFlowId);
    if (!elkNode || !elkNode.x || !elkNode.y || !sourceSchemaElkTree.x || !sourceSchemaElkTree.y) {
      console.error('Layout error: sourceSchema ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: nodeReactFlowId,
      data: {
        schemaNode: srcNode,
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
        x: sourceSchemaElkTree.x + elkNode.x,
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
    console.error('Layout error: Schema parent ElkNode not found, or missing x/y');
    return reactFlowNodes;
  }

  reactFlowNodes.push({
    id: parentNodeReactFlowId,
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
      console.error('Layout error: Schema child ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: childNodeReactFlowId,
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

  Object.entries(currentFunctionNodes).forEach(([functionKey, fnNode]) => {
    const elkNode = functionsElkTree.children?.find((node) => node.id === functionKey);
    if (!elkNode || !elkNode.x || !elkNode.y || !functionsElkTree.x || !functionsElkTree.y) {
      console.error('Layout error: Function ElkNode not found, or missing x/y');
      return;
    }

    reactFlowNodes.push({
      id: functionKey,
      data: {
        functionName: fnNode.functionName,
        displayHandle: true,
        maxNumberOfInputs: fnNode.maxNumberOfInputs,
        inputs: fnNode.inputs,
        functionBranding: getFunctionBrandingForCategory(fnNode.category),
        disabled: false,
        error: false,
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

export const convertToReactFlowEdges = (connections: ConnectionDictionary, selectedItemKey: string | undefined): ReactFlowEdge[] => {
  return Object.values(connections)
    .flatMap((connection) => {
      const nodeInputs = flattenInputs(connection.inputs).filter(isConnectionUnit);

      // Sort the resulting edges so that the selected edge is rendered last and thus on top of all other edges
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
    })
    .sort((a, b) => (!a.selected && b.selected ? -1 : a.selected && b.selected ? 0 : 1));
};

export const useOverviewLayout = (
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaType,
  shouldTargetSchemaDisplayChevrons?: boolean,
  toggledStatesDictionary?: NodeToggledStateDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode<SchemaCardProps>[]>([]);

  useEffect(() => {
    const newReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

    newReactFlowNodes.push({
      id: addReactFlowPrefix(parentSchemaNode.key, schemaType),
      data: {
        schemaNode: parentSchemaNode,
        schemaType,
        displayHandle: false,
        displayChevron: schemaType === SchemaType.Target && !!shouldTargetSchemaDisplayChevrons,
        isLeaf: false,
        isChild: false,
        disabled: false,
        error: false,
        relatedConnections: [],
        connectionStatus: toggledStatesDictionary ? toggledStatesDictionary[parentSchemaNode.key] : undefined,
      },
      type: ReactFlowNodeType.SchemaNode,
      position: {
        x: 0,
        y: 0,
      },
    });

    parentSchemaNode.children?.forEach((childNode, idx) => {
      newReactFlowNodes.push({
        id: addReactFlowPrefix(childNode.key, schemaType),
        data: {
          schemaNode: childNode,
          schemaType,
          displayHandle: false,
          displayChevron: schemaType === SchemaType.Target && !!shouldTargetSchemaDisplayChevrons,
          isLeaf: isLeafNode(childNode),
          isChild: true,
          disabled: false,
          error: false,
          relatedConnections: [],
          connectionStatus: toggledStatesDictionary ? toggledStatesDictionary[childNode.key] : undefined,
        },
        type: ReactFlowNodeType.SchemaNode,
        position: {
          x: childTargetNodeCardIndent,
          y: (idx + 1) * (schemaNodeCardHeight + 10),
        },
      });
    });

    setReactFlowNodes(newReactFlowNodes);
  }, [parentSchemaNode, schemaType, shouldTargetSchemaDisplayChevrons, toggledStatesDictionary]);

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
