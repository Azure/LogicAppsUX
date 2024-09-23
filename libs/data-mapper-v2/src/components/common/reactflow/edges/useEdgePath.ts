import { type EdgeProps, type InternalNode, type Node, useReactFlow } from '@xyflow/react';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, getTreeNodeId, isFunctionNode } from '../../../../utils/ReactFlow.Util';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { flattenSchemaNode } from '../../../../utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import type { HandlePosition } from '../../../../core/state/DataMapSlice';

const useEdgePath = (props: EdgeProps) => {
  const { source, target, sourceX, sourceY, targetX, targetY, data } = props;
  const { getInternalNode } = useReactFlow();
  const [updatedCoordinates, setUpdatedCoordinates] = useState<{
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
  }>({
    sourceX: undefined,
    sourceY: undefined,
    targetX: undefined,
    targetY: undefined,
  });

  const sourceNode = getInternalNode(NodeIds.source);
  const targetNode = getInternalNode(NodeIds.target);

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
    // Return [x, y] coordinates for the handle along with the scenario of the handle,
    // Scenario can be one of 'direct' (straight connection), or 'collpased' (parent is collapsed, at any level) or 'scroll' (handle scrolled out of view)
    const getCoordinatesForHandle = (
      nodeId: string,
      currentX: number,
      currentY: number,
      schema: SchemaNodeExtended[],
      openKeys: Record<string, boolean>,
      createReactFlowKey: (key: string) => string,
      node?: InternalNode<Node>,
      handleId?: string
    ): [number | undefined, number | undefined, string | undefined] => {
      // If the node is a function node, return the current x and y coordinates
      if (isFunctionNode(nodeId)) {
        return [currentX, currentY, 'direct'];
      }

      if (handleId && node?.internals.positionAbsolute) {
        let x: number | undefined = undefined;
        let y: number | undefined = undefined;
        let scenario: 'direct' | 'collapsed' | 'scroll' | undefined;
        let handle: HandlePosition | undefined = undefined;

        // Check if parent is hidden at some level
        const nodeFromSchema = schema.find((node) => node.key === getTreeNodeId(handleId));
        if (nodeFromSchema?.pathToRoot) {
          for (const path of nodeFromSchema.pathToRoot) {
            if (path.key === nodeFromSchema.key) {
              continue;
            }
            if (openKeys[path.key] === false) {
              handle = handlePosition[createReactFlowKey(path.key)];
              break;
            }
          }
        }

        // If handle is found => Parent is collapsed and we have the dimensions for the handle
        // handle.hidden is used to check if the handle is scrolled out of view or not
        if (handle && !handle.hidden) {
          x = handle.position.x;
          y = handle.position.y;
          scenario = 'collapsed';
        } else {
          // Get the handle directly
          handle = handlePosition[handleId];

          // Is handle not set or scrolled out of the view
          if (!handle || handle.hidden) {
            const indexForNodeInSchema = schema.findIndex((node) => node.key === getTreeNodeId(handleId));

            // Node is found in the schema, this will always be true since we are getting the handle from the schema
            if (indexForNodeInSchema >= 0) {
              let top = indexForNodeInSchema - 1;
              let bottom = indexForNodeInSchema + 1;
              while (top >= 0 && bottom < schema.length) {
                const topNode = schema[top];
                const bottomNode = schema[bottom];
                if (top >= 0) {
                  const topHandle = handlePosition[createReactFlowKey(topNode.key)];
                  if (topHandle && !topHandle.hidden) {
                    x = topHandle.position.x;
                    y = topHandle.position.y;
                    scenario = 'scroll';
                    break;
                  }
                  top--;
                }
                if (bottom < schema.length) {
                  const bottomHandle = handlePosition[createReactFlowKey(bottomNode.key)];
                  if (bottomHandle && !bottomHandle.hidden) {
                    x = bottomHandle.position.x;
                    y = bottomHandle.position.y;
                    scenario = 'scroll';
                    break;
                  }
                  bottom++;
                }
              }
            } else {
              throw new Error('Node not found in schema');
            }
          } else {
            // If the handle is present in the current view, return the x and y coordinates
            x = handle.position.x;
            y = handle.position.y;
            scenario = 'direct';
          }
        }

        if (x && y) {
          return [x + node.internals.positionAbsolute.x + 8, y + node.internals.positionAbsolute.y + 8, scenario];
        }
      }
      return [undefined, undefined, undefined];
    };

    const [updatedSourceX, updatedSourceY, sourceScenario] = getCoordinatesForHandle(
      source,
      sourceX,
      sourceY,
      flattenendSourceSchema,
      sourceOpenKeys,
      addSourceReactFlowPrefix,
      sourceNode,
      data?.sourceHandleId as string | undefined
    );
    const [updatedTargetX, updatedTargetY, targetScenario] = getCoordinatesForHandle(
      target,
      targetX,
      targetY,
      flattenendTargetSchema,
      targetOpenKeys,
      addTargetReactFlowPrefix,
      targetNode,
      data?.targetHandleId as string | undefined
    );

    // If the source and target handles are scrolled out of view, return empty object since edge shouldn't be shown in this case
    if (sourceScenario === 'scroll' && targetScenario === 'scroll') {
      setUpdatedCoordinates({});
    }

    setUpdatedCoordinates({
      sourceX: updatedSourceX,
      sourceY: updatedSourceY,
      targetX: updatedTargetX,
      targetY: updatedTargetY,
    });
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
  ]);

  return updatedCoordinates;
};

export default useEdgePath;
