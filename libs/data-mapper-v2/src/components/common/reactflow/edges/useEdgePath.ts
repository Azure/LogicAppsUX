import { type EdgeProps, type InternalNode, type Node, useReactFlow } from '@xyflow/react';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, getTreeNodeId, isFunctionNode } from '../../../../utils/ReactFlow.Util';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { flattenSchemaNode } from '../../../../utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import type { HandlePosition, SchemaTreeDataProps } from '../../../../core/state/DataMapSlice';

// Return [x, y] coordinates for the handle along with the scenario of the handle,
// Scenario can be one of 'direct' (straight connection), or 'collpased' (parent is collapsed, at any level) or 'scroll' (handle scrolled out of view)
const getCoordinatesForHandle = (
  nodeId: string,
  currentX: number,
  currentY: number,
  schema: SchemaNodeExtended[],
  openKeys: Record<string, boolean>,
  createReactFlowKey: (key: string) => string,
  handlePositionFromStore: Record<string, HandlePosition>,
  treeData?: SchemaTreeDataProps,
  node?: InternalNode<Node>,
  handleId?: string
): [number | undefined, number | undefined, string | undefined] => {
  // If the node is a function node, return the current x and y coordinates
  if (isFunctionNode(nodeId)) {
    return [currentX, currentY, 'direct'];
  }

  const reactflowHandles = node?.internals.handleBounds?.source ?? node?.internals.handleBounds?.target ?? [];

  if (handleId && node?.internals.positionAbsolute && treeData && treeData.startIndex > -1 && treeData.endIndex > -1) {
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;
    let scenario: 'direct' | 'collapsed' | 'scroll' | undefined;
    let currentHandle: HandlePosition | undefined = handlePositionFromStore[handleId];

    if (treeData.visibleNodes.find((node) => node.key === getTreeNodeId(handleId))) {
      if (currentHandle && !currentHandle.hidden) {
        // If the handle is present in the current view, return the x and y coordinates
        x = currentHandle.position.x;
        y = currentHandle.position.y;
        scenario = 'direct';
      }
    }

    if (x === undefined && y === undefined) {
      // Check if parent is hidden at some level
      const nodeFromSchema = schema.find((node) => node.key === getTreeNodeId(handleId));
      if (nodeFromSchema?.pathToRoot) {
        for (const path of nodeFromSchema.pathToRoot) {
          if (path.key === nodeFromSchema.key) {
            continue;
          }
          if (
            openKeys[path.key] !== undefined &&
            openKeys[path.key] === false &&
            treeData.visibleNodes.find((node) => node.key === path.key)
          ) {
            currentHandle = handlePositionFromStore[createReactFlowKey(path.key)];
            // If handle is found => Parent is collapsed and we have the dimensions for the handle
            // handle.hidden is used to check if the handle is scrolled out of view or not
            if (currentHandle && !currentHandle.hidden) {
              x = currentHandle.position.x;
              y = currentHandle.position.y;
              scenario = 'collapsed';
              break;
            }
          }
        }
      }
    }

    if (x === undefined && y === undefined) {
      const indexForNodeInSchema = schema.findIndex((node) => node.key === getTreeNodeId(handleId));
      if (indexForNodeInSchema >= 0) {
        if (indexForNodeInSchema > treeData.endIndex) {
          const reactflowHandle = reactflowHandles.find((handle) => handle.id?.startsWith('bottom-'));
          if (reactflowHandle) {
            x = reactflowHandle.x + node.internals.positionAbsolute.x;
            y = reactflowHandle.y + node.internals.positionAbsolute.y;
            scenario = 'scroll';
          }
        } else {
          const reactflowHandle = reactflowHandles.find((handle) => handle.id?.startsWith('top-'));
          if (reactflowHandle) {
            x = reactflowHandle.x + node.internals.positionAbsolute.x;
            y = reactflowHandle.y + node.internals.positionAbsolute.y;
            scenario = 'scroll';
          }
        }
      }
    }

    if (x !== undefined && y !== undefined) {
      return [x + 8, y + 8, scenario];
    }
  }
  return [undefined, undefined, undefined];
};

const useEdgePath = (props: EdgeProps) => {
  const { source, target, sourceX, sourceY, targetX, targetY, data } = props;
  const { getInternalNode } = useReactFlow();
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

  const sourceNode = useMemo(() => getInternalNode(NodeIds.source), [getInternalNode]);
  const targetNode = useMemo(() => getInternalNode(NodeIds.target), [getInternalNode]);

  const { sourceSchema, targetSchema, sourceOpenKeys, targetOpenKeys, handlePosition, schemaTreeData } = useSelector(
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
      handlePosition,
      schemaTreeData[source],
      sourceNode,
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
    handlePosition,
    schemaTreeData,
    source,
    sourceNode,
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
      handlePosition,
      schemaTreeData[target],
      targetNode,
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
    sourceNode,
    targetNode,
    sourceX,
    sourceY,
    targetX,
    targetY,
    flattenendSourceSchema,
    flattenendTargetSchema,
    sourceOpenKeys,
    targetOpenKeys,
    handlePosition,
    updatedTargetCoordinates.targetX,
    updatedTargetCoordinates.targetY,
    updatedTargetCoordinates.targetScenario,
    schemaTreeData,
  ]);

  return { ...updatedSourceCoordinates, ...updatedTargetCoordinates };
};

export default useEdgePath;
