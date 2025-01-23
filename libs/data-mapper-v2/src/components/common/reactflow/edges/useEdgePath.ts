import { type EdgeProps, useInternalNode } from '@xyflow/react';
import type { Handle } from '@xyflow/system';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, getTreeNodeId, isFunctionNode } from '../../../../utils/ReactFlow.Util';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { flattenSchemaNode } from '../../../../utils';
import { equals, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import type { SchemaTreeDataProps } from '../../../../core/state/DataMapSlice';

// Return [x, y] coordinates for the handle along with the scenario of the handle,
// Scenario can be one of 'direct' (straight connection), or 'collpased' (parent is collapsed, at any level) or 'scroll' (handle scrolled out of view)
const getCoordinatesForHandle = (
  nodeId: string,
  currentX: number,
  currentY: number,
  schema: SchemaNodeExtended[],
  openKeys: Record<string, boolean>,
  createReactFlowKey: (key: string) => string,
  treeData?: SchemaTreeDataProps,
  nodeX?: number,
  nodeY?: number,
  handleBounds?: Handle[],
  handleId?: string
): [number | undefined, number | undefined, string | undefined] => {
  // If the node is a function node, return the current x and y coordinates
  if (isFunctionNode(nodeId)) {
    return [currentX, currentY, 'direct'];
  }

  if (
    handleId &&
    nodeX !== undefined &&
    nodeY !== undefined &&
    handleBounds !== undefined &&
    treeData &&
    treeData.startIndex > -1 &&
    treeData.endIndex > -1
  ) {
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;
    let scenario: 'direct' | 'collapsed' | 'scroll' | undefined;
    let currentHandle = handleBounds.find((handle) => equals(handleId, handle.id ?? ''));
    let showEdge = false; // This is true only if the current node is visible (i.e. either in the search result or not collapsed) or one of the parent is visible

    const { visibleNodes, startIndex, endIndex } = treeData;
    const nodeIndexInVisibleNodes = visibleNodes.findIndex((node) => node.key === getTreeNodeId(handleId));

    if (nodeIndexInVisibleNodes === -1) {
      // Note: Either current node is not in the search results or is collapsed
    } else {
      showEdge = true;
      if (nodeIndexInVisibleNodes >= startIndex && nodeIndexInVisibleNodes <= endIndex) {
        // Current node is in the search result and on the canvas

        if (currentHandle) {
          // If the handle is present in the current view, return the x and y coordinates
          x = currentHandle.x;
          y = currentHandle.y;
          scenario = 'direct';
        }
      }
    }

    if (x === undefined && y === undefined) {
      // Check if parent is hidden at some level
      const nodeFromSchema = schema.find((node) => node.key === getTreeNodeId(handleId));
      if (nodeFromSchema?.pathToRoot) {
        for (const path of nodeFromSchema.pathToRoot) {
          // Node is collapsed but parent is in the tree
          if (path.key !== nodeFromSchema.key && openKeys[path.key] !== undefined && openKeys[path.key] === false) {
            const parentNodeInVisibleNodes = visibleNodes.findIndex((node) => node.key === path.key);
            if (parentNodeInVisibleNodes === -1) {
              // Note: Either current node is not in the search results or is collapsed
            } else {
              showEdge = true;
              if (parentNodeInVisibleNodes >= startIndex && parentNodeInVisibleNodes <= endIndex) {
                currentHandle = handleBounds.find((handle) => equals(createReactFlowKey(path.key), handle.id ?? ''));
                // If handle is found => Parent is collapsed and we have the dimensions for the handle
                if (currentHandle) {
                  x = currentHandle.x;
                  y = currentHandle.y;
                  scenario = 'collapsed';
                  break;
                }
              }
            }
          }
        }
      }
    }

    // If the current node and parent are scrolled out but in search result or current node is collapsed and one of the parent is in search result
    if (showEdge && x === undefined && y === undefined) {
      const indexForNodeInSchema = schema.findIndex((node) => equals(node.key, getTreeNodeId(handleId)));
      if (indexForNodeInSchema >= 0) {
        const lastNodeOnCanvasIndex = schema.findIndex((node) => equals(node.key, visibleNodes[endIndex].key));
        if (lastNodeOnCanvasIndex > -1) {
          if (indexForNodeInSchema > lastNodeOnCanvasIndex) {
            const reactflowHandle = handleBounds.find((handle) => handle.id?.startsWith('bottom-'));
            if (reactflowHandle) {
              x = reactflowHandle.x;
              y = reactflowHandle.y;
              scenario = 'scroll';
            }
          } else {
            const reactflowHandle = handleBounds.find((handle) => handle.id?.startsWith('top-'));
            if (reactflowHandle) {
              x = reactflowHandle.x;
              y = reactflowHandle.y;
              scenario = 'scroll';
            }
          }
        }
      }
    }

    if (x !== undefined && y !== undefined && scenario !== undefined) {
      return [x + nodeX + 8, y + nodeY + 8, scenario];
    }
  }
  return [undefined, undefined, undefined];
};

const useEdgePath = (props: EdgeProps) => {
  const { source, target, sourceX, sourceY, targetX, targetY, data } = props;
  const [updatedSourceCoordinates, setUpdatedSourceCoordinates] = useState<{
    sourceX?: number;
    sourceY?: number;
    sourceScenario?: string;
  }>({
    sourceX: undefined,
    sourceY: undefined,
    sourceScenario: undefined,
  });

  const [updatedTargetCoordinates, setUpdatedTargetCoordinates] = useState<{
    targetX?: number;
    targetY?: number;
    targetScenario?: string;
  }>({
    targetX: undefined,
    targetY: undefined,
    targetScenario: undefined,
  });

  const sourceNode = useInternalNode(NodeIds.source);
  const targetNode = useInternalNode(NodeIds.target);
  const absoluteSourceNodeX = sourceNode?.internals.positionAbsolute.x;
  const absoluteSourceNodeY = sourceNode?.internals.positionAbsolute.y;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sourceHandleBounds = sourceNode?.internals.handleBounds?.source ?? [];

  const absoluteTargetNodeX = targetNode?.internals.positionAbsolute.x;
  const absoluteTargetNodeY = targetNode?.internals.positionAbsolute.y;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const targetHandleBounds = targetNode?.internals.handleBounds?.target ?? [];

  const { sourceSchema, targetSchema, sourceOpenKeys, targetOpenKeys, sourceSchemaTreeData, targetSchemaTreeData } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );

  const flattenendSourceSchema = useMemo(
    () => (sourceSchema?.schemaTreeRoot ? flattenSchemaNode(sourceSchema?.schemaTreeRoot) : []),
    [sourceSchema]
  );
  const flattenendTargetSchema = useMemo(
    () => (targetSchema?.schemaTreeRoot ? flattenSchemaNode(targetSchema?.schemaTreeRoot) : []),
    [targetSchema]
  );

  useEffect(() => {
    const [updatedSourceX, updatedSourceY, updatedSourceScenario] = getCoordinatesForHandle(
      source,
      sourceX,
      sourceY,
      flattenendSourceSchema,
      sourceOpenKeys,
      addSourceReactFlowPrefix,
      sourceSchemaTreeData,
      absoluteSourceNodeX,
      absoluteSourceNodeY,
      sourceHandleBounds,
      data?.sourceHandleId as string | undefined
    );

    if (
      updatedSourceCoordinates.sourceX !== updatedSourceX ||
      updatedSourceCoordinates.sourceY !== updatedSourceY ||
      updatedSourceCoordinates.sourceScenario !== updatedSourceScenario
    ) {
      setUpdatedSourceCoordinates({
        sourceX: updatedSourceX,
        sourceY: updatedSourceY,
        sourceScenario: updatedSourceScenario,
      });
    }
  }, [
    data?.sourceHandleId,
    flattenendSourceSchema,
    sourceSchemaTreeData,
    source,
    absoluteSourceNodeX,
    absoluteSourceNodeY,
    sourceHandleBounds,
    sourceOpenKeys,
    sourceX,
    sourceY,
    updatedSourceCoordinates.sourceScenario,
    updatedSourceCoordinates.sourceX,
    updatedSourceCoordinates.sourceY,
  ]);

  useEffect(() => {
    const [updatedTargetX, updatedTargetY, updatedTargetScenario] = getCoordinatesForHandle(
      target,
      targetX,
      targetY,
      flattenendTargetSchema,
      targetOpenKeys,
      addTargetReactFlowPrefix,
      targetSchemaTreeData,
      absoluteTargetNodeX,
      absoluteTargetNodeY,
      targetHandleBounds,
      data?.targetHandleId as string | undefined
    );

    // If the source and target handles are scrolled out of view, return empty object since edge shouldn't be shown in this case
    if (
      updatedTargetCoordinates.targetX !== updatedTargetX ||
      updatedTargetCoordinates.targetY !== updatedTargetY ||
      updatedTargetCoordinates.targetScenario !== updatedTargetScenario
    ) {
      setUpdatedTargetCoordinates({
        targetX: updatedTargetX,
        targetY: updatedTargetY,
        targetScenario: updatedTargetScenario,
      });
    }
  }, [
    source,
    target,
    data,
    sourceX,
    sourceY,
    targetX,
    targetY,
    flattenendSourceSchema,
    flattenendTargetSchema,
    sourceOpenKeys,
    targetOpenKeys,
    updatedTargetCoordinates.targetX,
    updatedTargetCoordinates.targetY,
    updatedTargetCoordinates.targetScenario,
    targetSchemaTreeData,
    absoluteTargetNodeX,
    absoluteTargetNodeY,
    targetHandleBounds,
  ]);

  return { ...updatedSourceCoordinates, ...updatedTargetCoordinates };
};

export default useEdgePath;
