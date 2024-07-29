// import type { CardProps } from '../components/nodeCard/NodeCard';
// import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
// import type { FunctionCardProps } from '../components/nodeCard/functionCard/FunctionCard';
// import type { NodeToggledStateDictionary } from '../components/tree/TargetSchemaTreeItem';
// import {
//   childTargetNodeCardIndent,
//   schemaNodeCardDefaultWidth,
//   schemaNodeCardHeight,
//   schemaNodeCardWidthDifference,
// } from '../constants/NodeConstants';
// import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
// import type { ConnectionDictionary, ConnectionUnit } from '../models/Connection';
// import type { FunctionData, FunctionDictionary } from '../models/Function';
// import { functionsForLocation, getFunctionBrandingForCategory } from './Function.Utils';
// import type { LayoutNode, RootLayoutNode } from './Layout.Utils';
// import { applyCustomLayout, convertDataMapNodesToLayoutTree, convertWholeDataMapToLayoutTree } from './Layout.Utils';
// import { LogCategory, LogService } from './Logging.Utils';
// import { isLeafNode } from './Schema.Utils';
// import { guid, SchemaType } from '@microsoft/logic-apps-shared';
// import type { SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
// import { useEffect, useState } from 'react';
// import type { Edge as ReactFlowEdge, Node as ReactFlowNode, XYPosition } from 'reactflow';
// import { Position } from 'reactflow';

import { guid, type SchemaType, type SchemaNodeDictionary } from '@microsoft/logic-apps-shared';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData, FunctionDictionary } from 'models';
import type { ConnectionDictionary } from '../models/Connection';
import { generateInputHandleId, isConnectionUnit } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';

export const addReactFlowPrefix = (key: string, type: SchemaType) => `${type}-${key}`;
export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;

export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;

const rootLayoutNodeId = 'root';
export const LayoutContainer = {
  SourceSchema: 'sourceSchemaBlock',
  Functions: 'functionsBlock',
  TargetSchema: 'targetSchemaBlock',
} as const;
type LayoutContainer = (typeof LayoutContainer)[keyof typeof LayoutContainer];

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

// export const overviewTgtSchemaX = 600;

// interface SimplifiedLayoutEdge {
//   srcRfId: string;
//   tgtRfId: string;
//   tgtPort?: string;
// }

// interface Size2D {
//   width: number;
//   height: number;
// }

// export interface ReactFlowIdParts {
//   sourceId: string;
//   destinationId: string | undefined;
//   portId: string | undefined;
// }

// export const functionPlaceholderPosition: XYPosition = {
//   x: -300,
//   y: 15,
// };

// const hiddenFunctionSection: ReactFlowNode = {
//   id: 'new-function-placeholder',
//   hidden: true,
//   data: null,
//   connectable: false,
//   position: {
//     x: functionPlaceholderPosition.x + 100,
//     y: functionPlaceholderPosition.y,
//   },
// };

// const placeholderNewFunctionSection: ReactFlowNode = {
//   id: 'new-function-section',
//   hidden: false,
//   data: null,
//   connectable: false,
//   draggable: false,
//   height: 10,
//   width: schemaNodeCardDefaultWidth,
//   type: ReactFlowNodeType.FunctionPlaceholder,
//   style: {
//     height: '260px',
//     width: '200px',
//     background: 'transparent',
//   },
//   position: functionPlaceholderPosition,
// };

// // Hidden dummy node placed at 0,0 (same as source schema block) to allow initial load fitView to center diagram
// // NOTE: Not documented, but hidden nodes need a width/height to properly affect fitView when includeHiddenNodes option is true
// const placeholderReactFlowNode: ReactFlowNode = {
//   id: 'layouting-&-Placeholder',
//   hidden: true,
//   sourcePosition: Position.Right,
//   data: null,
//   width: schemaNodeCardDefaultWidth,
//   height: 10,
//   position: {
//     x: 0,
//     y: 0,
//   },
// };

// export const useLayout = (
//   currentSourceSchemaNodes: SchemaNodeExtended[],
//   functionNodes: FunctionDictionary,
//   currentTargetSchemaNode: SchemaNodeExtended | undefined,
//   connections: ConnectionDictionary,
//   selectedItemKey: string | undefined,
//   sourceSchemaOrdering: string[],
//   useExpandedFunctionCards: boolean
// ): [ReactFlowNode[], ReactFlowEdge[], Size2D, boolean] => {
//   const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
//   const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);
//   const [diagramSize, setDiagramSize] = useState<Size2D>({ width: 0, height: 0 });

//   useEffect(() => {
//     if (currentTargetSchemaNode) {
//       const visibleFunctionNodes = functionsForLocation(functionNodes, currentTargetSchemaNode.key);

//       // Sort source schema nodes according to their order in the schema
//       const sortedSourceSchemaNodes = [...currentSourceSchemaNodes].sort(
//         (nodeA, nodeB) => sourceSchemaOrdering.indexOf(nodeA.key) - sourceSchemaOrdering.indexOf(nodeB.key)
//       );

//       // Build a nicely formatted tree for easier layouting
//       const layoutTreeFromCanvasNodes = convertDataMapNodesToLayoutTree(
//         sortedSourceSchemaNodes,
//         visibleFunctionNodes,
//         currentTargetSchemaNode,
//         connections
//       );

//       // Compute layout
//       applyCustomLayout(layoutTreeFromCanvasNodes, functionNodes, useExpandedFunctionCards, false)
//         .then((computedLayout) => {
//           // Convert the calculated layout to ReactFlow nodes + edges
//           setReactFlowNodes([
//             hiddenFunctionSection,
//             placeholderNewFunctionSection,
//             placeholderReactFlowNode,
//             ...convertToReactFlowNodes(computedLayout, selectedItemKey, sortedSourceSchemaNodes, visibleFunctionNodes, [
//               currentTargetSchemaNode,
//               ...currentTargetSchemaNode.children,
//             ]),
//           ]);

//           const simpleLayoutEdgeResults: SimplifiedLayoutEdge[] = [
//             ...computedLayout.edges.map((layoutEdge) => ({
//               srcRfId: layoutEdge.sourceId,
//               tgtRfId: layoutEdge.targetId,
//               tgtPort: layoutEdge.labels.length > 0 ? layoutEdge.labels[0] : undefined,
//             })),
//           ];
//           setReactFlowEdges(convertToReactFlowEdges(simpleLayoutEdgeResults, selectedItemKey, true));

//           // Calculate diagram size
//           setDiagramSize({
//             width: computedLayout.width ?? 0,
//             height: computedLayout.height ?? 0,
//           });
//         })
//         .catch((error) => {
//           LogService.error(LogCategory.ReactFlowUtils, 'Layouting', {
//             message: `${error}`,
//           });
//         });
//     } else {
//       setReactFlowNodes([]);
//       setReactFlowEdges([]);
//       setDiagramSize({ width: 0, height: 0 });
//     }
//   }, [
//     currentTargetSchemaNode,
//     currentSourceSchemaNodes,
//     functionNodes,
//     connections,
//     sourceSchemaOrdering,
//     selectedItemKey,
//     useExpandedFunctionCards,
//   ]);

//   return [reactFlowNodes, reactFlowEdges, diagramSize, false];
// };

// export const convertToReactFlowNodes = (
//   layoutTree: RootLayoutNode,
//   selectedNodeId: string | undefined,
//   currentSourceSchemaNodes: SchemaNodeExtended[],
//   functionNodes: FunctionDictionary,
//   currentTargetSchemaNodes: SchemaNodeExtended[]
// ): ReactFlowNode<CardProps>[] => {
//   return [
//     ...convertSourceSchemaToReactFlowNodes(layoutTree.children[0], currentSourceSchemaNodes),
//     ...convertFunctionsToReactFlowParentAndChildNodes(layoutTree.children[1], selectedNodeId, functionNodes),
//     ...convertTargetSchemaToReactFlowNodes(layoutTree.children[2], currentTargetSchemaNodes),
//   ];
// };

// const convertSourceSchemaToReactFlowNodes = (
//   sourceSchemaLayoutTree: LayoutNode,
//   combinedSourceSchemaNodes: SchemaNodeExtended[]
// ): ReactFlowNode<SchemaCardProps>[] => {
//   return convertSchemaToReactFlowNodes(sourceSchemaLayoutTree, combinedSourceSchemaNodes, SchemaType.Source);
// };

// const convertTargetSchemaToReactFlowNodes = (
//   targetSchemaLayoutTree: LayoutNode,
//   targetSchemaNodes: SchemaNodeExtended[]
// ): ReactFlowNode<SchemaCardProps>[] => {
//   return convertSchemaToReactFlowNodes(targetSchemaLayoutTree, targetSchemaNodes, SchemaType.Target);
// };

// export const convertSchemaToReactFlowNodes = (
//   layoutTree: LayoutNode,
//   schemaNodes: SchemaNodeExtended[],
//   schemaType: SchemaType
// ): ReactFlowNode<SchemaCardProps>[] => {
//   const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
//   const isSourceSchema = schemaType === SchemaType.Source;
//   const depthArray = nodeArrayDepth(schemaNodes);
//   const maxLocalDepth = depthArray.length;

//   schemaNodes.forEach((schemaNode, index) => {
//     const reactFlowId = addReactFlowPrefix(schemaNode.key, schemaType);
//     const curDepth = depthArray.indexOf(schemaNode.pathToRoot.length);

//     const layoutNode = layoutTree.children?.find((node) => node.id === reactFlowId);
//     if (!layoutNode || layoutNode.x === undefined || layoutNode.y === undefined) {
//       LogService.error(LogCategory.ReactFlowUtils, 'convertSchemaToReactFlowNodes', {
//         message: 'Layout error: LayoutNode not found, or missing x/y',
//         data: {
//           schemaType,
//           layoutData: {
//             layoutNodeX: layoutNode?.x,
//             layoutNodeY: layoutNode?.y,
//           },
//         },
//       });

//       return;
//     }

//     reactFlowNodes.push({
//       id: reactFlowId,
//       zIndex: 101, // Just for schema nodes to render N-badge over edges
//       data: {
//         schemaNode,
//         schemaType,
//         displayHandle: true,
//         displayChevron: !isSourceSchema && index !== 0, // The first target node is the parent
//         isLeaf: isLeafNode(schemaNode),
//         width: calculateWidth(curDepth, maxLocalDepth),
//         disabled: false,
//         disableContextMenu: schemaType === SchemaType.Target,
//       },
//       draggable: false,
//       type: ReactFlowNodeType.SchemaNode,
//       targetPosition: isSourceSchema ? Position.Right : Position.Left,
//       position: {
//         x: layoutNode.x + curDepth * childTargetNodeCardIndent,
//         y: layoutNode.y,
//       },
//     });
//   });

//   return reactFlowNodes;
// };

// const convertFunctionsToReactFlowParentAndChildNodes = (
//   functionsLayoutTree: LayoutNode,
//   selectedNodeId: string | undefined,
//   functionNodes: FunctionDictionary
// ): ReactFlowNode<FunctionCardProps>[] => {
//   const reactFlowNodes: ReactFlowNode<FunctionCardProps>[] = [];
//   Object.entries(functionNodes).forEach(([functionKey, fnNode], idx) => {
//     const functionData = fnNode.functionData;
//     const layoutNode = functionsLayoutTree.children?.find((node) => node.id === functionKey);
//     const isSelectedNode = functionKey === selectedNodeId;

//     if (!layoutNode || layoutNode.x === undefined || layoutNode.y === undefined) {
//       LogService.error(LogCategory.ReactFlowUtils, 'convertFunctionsToReactFlowParentAndChildNodes', {
//         message: 'Layout error: LayoutNode not found, or missing x/y',
//         data: {
//           layoutData: {
//             layoutNodeX: layoutNode?.x,
//             layoutNodeY: layoutNode?.y,
//           },
//         },
//       });

//       return;
//     }

//     reactFlowNodes.push({
//       id: functionKey,
//       data: {
//         functionData,
//         displayHandle: true,
//         functionBranding: getFunctionBrandingForCategory(functionData.category),
//         disabled: false,
//         dataTestId: `${functionData.key}-${idx}`, // For e2e testing
//       },
//       type: ReactFlowNodeType.FunctionNode,
//       sourcePosition: Position.Right,
//       draggable: true,

//       position: {
//         x: layoutNode.x,
//         y: layoutNode.y,
//       },
//       zIndex: isSelectedNode ? 150 : 0,
//     });
//   });

//   return reactFlowNodes;
// };

// export const convertToReactFlowEdges = (
//   simplifiedLayoutEdges: SimplifiedLayoutEdge[],
//   selectedItemKey?: string,
//   setEdgeType?: boolean
// ): ReactFlowEdge[] => {
//   // NOTE: All validation (Ex: making sure edges given to the layouter are actively on canvas) is handled pre-layouting
//   return simplifiedLayoutEdges
//     .map<ReactFlowEdge>((simplifiedLayoutEdge) => {
//       // Sort the resulting edges so that the selected edge is rendered last and thus on top of all other edges
//       const id = createReactFlowConnectionId(simplifiedLayoutEdge.srcRfId, simplifiedLayoutEdge.tgtRfId, simplifiedLayoutEdge.tgtPort);
//       return {
//         id,
//         source: simplifiedLayoutEdge.srcRfId,
//         target: simplifiedLayoutEdge.tgtRfId,
//         targetHandle: simplifiedLayoutEdge.tgtPort,
//         type: setEdgeType ? ReactFlowEdgeType.ConnectionEdge : undefined,
//         selected: selectedItemKey === id,
//       };
//     })
//     .sort((a, b) => (!a.selected && b.selected ? -1 : a.selected && b.selected ? 0 : 1));
// };

// export const useOverviewLayout = (
//   srcSchemaTreeRoot: SchemaNodeExtended | undefined,
//   tgtSchemaTreeRoot: SchemaNodeExtended | undefined,
//   targetSchemaStates: NodeToggledStateDictionary
// ): ReactFlowNode<SchemaCardProps>[] => {
//   const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode<SchemaCardProps>[]>([]);

//   useEffect(() => {
//     const sourceReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
//     const targetReactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

//     // Dummy source schema node
//     sourceReactFlowNodes.push({ ...placeholderReactFlowNode });

//     // Source schema nodes
//     if (srcSchemaTreeRoot) {
//       addChildNodesForOverview(srcSchemaTreeRoot, 0, 1, sourceReactFlowNodes, true, !!srcSchemaTreeRoot, undefined, 1);
//     }

//     // Dummy target schema node
//     targetReactFlowNodes.push({
//       ...placeholderReactFlowNode,
//       position: { x: overviewTgtSchemaX, y: 0 },
//       id: 'layouting-&-Placeholder-Tgt',
//     });

//     // Target schema nodes
//     if (tgtSchemaTreeRoot) {
//       addChildNodesForOverview(tgtSchemaTreeRoot, 0, 1, targetReactFlowNodes, false, !!srcSchemaTreeRoot, targetSchemaStates, 1);
//     }

//     setReactFlowNodes([...sourceReactFlowNodes, ...targetReactFlowNodes]);
//   }, [srcSchemaTreeRoot, tgtSchemaTreeRoot, targetSchemaStates]);

//   return reactFlowNodes;
// };

// export const useGlobalViewLayout = (
//   selectedNodeId: string | undefined,
//   flattenedSourceSchema: SchemaNodeDictionary,
//   flattenedTargetSchema: SchemaNodeDictionary,
//   functionsNodes: FunctionDictionary,
//   connections: ConnectionDictionary
// ): [ReactFlowNode[], ReactFlowEdge[]] => {
//   const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode<CardProps>[]>([]);
//   const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);
//   //const [diagramSize, setDiagramSize] = useState<Size2D>({ width: 0, height: 0 });

//   useEffect(() => {
//     // Build a nicely formatted tree for easier layouting
//     const layoutTreeFromCanvasNodes = convertWholeDataMapToLayoutTree(
//       flattenedSourceSchema,
//       flattenedTargetSchema,
//       functionsNodes,
//       connections
//     );

//     // Compute layout
//     applyCustomLayout(layoutTreeFromCanvasNodes, {}, false, true)
//       .then((computedLayoutTree) => {
//         // Convert the calculated layout to ReactFlow nodes + edges
//         setReactFlowNodes([
//           placeholderReactFlowNode,
//           ...convertToReactFlowNodes(
//             computedLayoutTree,
//             selectedNodeId,
//             Object.values(flattenedSourceSchema),
//             functionsNodes,
//             Object.values(flattenedTargetSchema)
//           ),
//         ]);

//         const simpleLayoutEdgeResults: SimplifiedLayoutEdge[] = [
//           ...computedLayoutTree.edges.map((layoutEdge) => ({
//             srcRfId: layoutEdge.sourceId,
//             tgtRfId: layoutEdge.targetId,
//             tgtPort: layoutEdge.labels.length > 0 ? layoutEdge.labels[0] : undefined,
//           })),
//         ];

//         setReactFlowEdges(convertToReactFlowEdges(simpleLayoutEdgeResults, undefined, false));

//         // Calculate diagram size
//         /*
//         setDiagramSize({
//           width: computedLayoutTree.width ?? 0,
//           height: computedLayoutTree.height ?? 0,
//         });
//         */
//       })
//       .catch((error) => {
//         LogService.error(LogCategory.ReactFlowUtils, 'Layouting', {
//           message: `${error}`,
//         });
//       });
//   }, [connections, flattenedSourceSchema, flattenedTargetSchema, functionsNodes, selectedNodeId]);

//   return [reactFlowNodes, reactFlowEdges];
// };

// // May be used someday
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const nodeTreeDepth = (node: SchemaNodeExtended): number => 1 + childrenDepth(node);
// const childrenDepth = (node: SchemaNodeExtended): number => {
//   return 1 + Math.max(-1, ...node.children.map(childrenDepth));
// };

// const nodeArrayDepth = (nodes: SchemaNodeExtended[]): number[] => {
//   const depth: Set<number> = new Set();

//   nodes.forEach((node) => {
//     depth.add(node.pathToRoot.length);
//   });

//   return Array.from(depth);
// };

// const addChildNodesForOverview = (
//   curNode: SchemaNodeExtended,
//   curDepth: number,
//   maxDepth: number,
//   resultArray: ReactFlowNode<SchemaCardProps>[],
//   isSourceSchema: boolean,
//   sourceSchemaSpecified: boolean,
//   targetSchemaStates: NodeToggledStateDictionary | undefined,
//   generateToDepth?: number
// ): void => {
//   const baseSchemaNodeData = {
//     schemaType: isSourceSchema ? SchemaType.Source : SchemaType.Target,
//     displayChevron: false,
//     displayHandle: false,
//     disabled: false,
//     connectionStatus: !isSourceSchema && targetSchemaStates ? targetSchemaStates[curNode.key] : undefined,
//   };

//   resultArray.push({
//     id: isSourceSchema ? addSourceReactFlowPrefix(curNode.key) : addTargetReactFlowPrefix(curNode.key),
//     data: {
//       ...baseSchemaNodeData,
//       schemaNode: curNode,
//       width: calculateWidth(curDepth, maxDepth),
//       isLeaf: isLeafNode(curNode),
//       disableContextMenu: true,
//     },
//     type: ReactFlowNodeType.SchemaNode,
//     position: {
//       x: (isSourceSchema ? 0 : overviewTgtSchemaX) + curDepth * schemaNodeCardWidthDifference,
//       y: (resultArray.length - 1) * (schemaNodeCardHeight + 10),
//     },
//   });

//   if (generateToDepth === undefined || curDepth < generateToDepth) {
//     curNode.children.forEach((childNode) => {
//       addChildNodesForOverview(
//         childNode,
//         curDepth + 1,
//         maxDepth,
//         resultArray,
//         isSourceSchema,
//         sourceSchemaSpecified,
//         targetSchemaStates,
//         generateToDepth
//       );
//     });
//   }
// };

// const calculateWidth = (curDepth: number, maxDepth: number): number => {
//   const breakEvenDepth = 4;

//   if (maxDepth < breakEvenDepth) {
//     return schemaNodeCardDefaultWidth - curDepth * schemaNodeCardWidthDifference;
//   }

//   const curDepthDiff = maxDepth - curDepth;
//   return schemaNodeCardDefaultWidth + (curDepthDiff - breakEvenDepth) * schemaNodeCardWidthDifference;
// };

// export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;

// export const addReactFlowPrefix = (key: string, type: SchemaType) => `${type}-${key}`;
// export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
// export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;

// export const reactFlowConnectionIdSeparator = '-to-';
// export const reactFlowConnectionPortSeparator = '-port-';
// export const createReactFlowConnectionId = (sourceId: string, targetId: string, port: string | undefined): string => {
//   let result = `${sourceId}${reactFlowConnectionIdSeparator}${targetId}`;

//   if (port) {
//     result = result + `${reactFlowConnectionPortSeparator}${port}`;
//   }

//   return result;
// };

// export const getSplitIdsFromReactFlowConnectionId = (reactFlowId: string): ReactFlowIdParts => {
//   const sourceDestSplit = reactFlowId.split(reactFlowConnectionIdSeparator);
//   const destPortSplit = sourceDestSplit.length > 1 ? sourceDestSplit[1].split(reactFlowConnectionPortSeparator) : [undefined, undefined];

//   return {
//     sourceId: sourceDestSplit[0],
//     destinationId: destPortSplit[0],
//     portId: destPortSplit[1],
//   };
// };
// export const getSourceIdFromReactFlowConnectionId = (reactFlowId: string): string => reactFlowId.split(reactFlowConnectionIdSeparator)[0];
// export const getDestinationIdFromReactFlowConnectionId = (reactFlowId: string): string =>
//   reactFlowId.split(reactFlowConnectionIdSeparator)[1].split(reactFlowConnectionPortSeparator, 1)[0];
// export const getPortFromReactFlowConnectionId = (reactFlowId: string): string | undefined =>
//   reactFlowId.split(reactFlowConnectionPortSeparator)[1];

// export const isNodeHighlighted = (
//   isCurrentNodeSelected: boolean,
//   currentReactFlowId: string,
//   selectedItemConnectedNodes: ConnectionUnit[]
// ): boolean => !isCurrentNodeSelected && selectedItemConnectedNodes.some((node) => node.reactFlowKey === currentReactFlowId);

// export const isEdgeHighlighted = (
//   isCurrentNodeSelected: boolean,
//   currentItemSplit: ReactFlowIdParts,
//   selectedItemConnectedNodes: ConnectionUnit[]
// ): boolean => {
//   if (isCurrentNodeSelected) {
//     return false;
//   }

//   if (currentItemSplit.destinationId) {
//     return (
//       selectedItemConnectedNodes.some((node) => node.reactFlowKey === currentItemSplit.sourceId) &&
//       selectedItemConnectedNodes.some((node) => node.reactFlowKey === currentItemSplit.destinationId)
//     );
//   } else {
//     return selectedItemConnectedNodes.some((node) => node.reactFlowKey === currentItemSplit.sourceId);
//   }
// };
