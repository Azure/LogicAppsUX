import { type EdgeProps, type InternalNode, type Node, useReactFlow } from '@xyflow/react';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, getTreeNodeId, isFunctionNode } from '../../../../utils/ReactFlow.Util';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { flattenSchemaNode } from '../../../../utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import type { HandlePosition } from '../../../../core/state/DataMapSlice';

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
  node?: InternalNode<Node>,
  handleId?: string
): [number | undefined, number | undefined, string | undefined] => {
  // If the node is a function node, return the current x and y coordinates
  if (isFunctionNode(nodeId)) {
    return [currentX, currentY, 'direct'];
  }

  const reactflowHandles = node?.internals.handleBounds?.source ?? node?.internals.handleBounds?.target ?? [];

  if (handleId && node?.internals.positionAbsolute) {
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;
    let scenario: 'direct' | 'collapsed' | 'scroll' | undefined;
    let currentHandle: HandlePosition | undefined = undefined;

    // Check if parent is hidden at some level
    const nodeFromSchema = schema.find((node) => node.key === getTreeNodeId(handleId));
    if (nodeFromSchema?.pathToRoot) {
      for (const path of nodeFromSchema.pathToRoot) {
        if (path.key === nodeFromSchema.key) {
          continue;
        }
        if (openKeys[path.key] !== undefined && openKeys[path.key] === false) {
          currentHandle = handlePositionFromStore[createReactFlowKey(path.key)];
          break;
        }
      }
    }

    // If handle is found => Parent is collapsed and we have the dimensions for the handle
    // handle.hidden is used to check if the handle is scrolled out of view or not
    if (currentHandle && !currentHandle.hidden) {
      x = currentHandle.position.x;
      y = currentHandle.position.y;
      scenario = 'collapsed';
    } else {
      // Get the handle directly
      currentHandle = handlePositionFromStore[handleId];

      // Is handle not set or scrolled out of the view
      if (!currentHandle || currentHandle.hidden) {
        const indexForNodeInSchema = schema.findIndex((node) => node.key === getTreeNodeId(handleId));

        // Node is found in the schema, this will always be true since we are getting the handle from the schema
        if (indexForNodeInSchema >= 0) {
          let top = indexForNodeInSchema - 1;
          let bottom = indexForNodeInSchema + 1;
          while (top >= 0 && bottom < schema.length) {
            const topNode = schema[top];
            const bottomNode = schema[bottom];
            if (top >= 0) {
              const topHandle = handlePositionFromStore[createReactFlowKey(topNode.key)];
              if (topHandle && !topHandle.hidden) {
                bottom = schema.length;
                break;
              }
              top--;
            }
            if (bottom < schema.length) {
              const bottomHandle = handlePositionFromStore[createReactFlowKey(bottomNode.key)];
              if (bottomHandle && !bottomHandle.hidden) {
                top = -1;
                break;
              }
              bottom++;
            }
          }

          const reactflowHandle = reactflowHandles.find((handle) => handle.id?.startsWith(top >= 0 ? 'bottom-' : 'top-'));

          // Top or bottom handles are always there in the react flow
          if (reactflowHandle) {
            x = currentHandle.position.x;
            y = currentHandle.position.y;
            scenario = 'scroll';
          } else {
            throw new Error('Dummy Node not found in schema');
          }
        } else {
          throw new Error('Node not found in schema');
        }
      } else {
        // If the handle is present in the current view, return the x and y coordinates
        x = currentHandle.position.x;
        y = currentHandle.position.y;
        scenario = 'direct';
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

  const { sourceSchema, targetSchema, sourceOpenKeys, targetOpenKeys, handlePosition } = useSelector(
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
  ]);

  return { ...updatedSourceCoordinates, ...updatedTargetCoordinates };
};

export default useEdgePath;
