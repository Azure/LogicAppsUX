import { type EdgeProps, type InternalNode, type Node, useReactFlow } from '@xyflow/react';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import {
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  getTreeNodeId,
  isFunctionNode,
  isIntermediateNode,
} from '../../../../utils/ReactFlow.Util';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { flattenSchemaNode } from '../../../../utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sourceHandles = sourceNode?.internals?.handleBounds?.source ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const targetHandles = targetNode?.internals?.handleBounds?.target ?? [];

  const { sourceSchema, targetSchema, sourceOpenKeys, targetOpenKeys } = useSelector(
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
      allHandles: any[],
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

      if (handleId && node?.internals.positionAbsolute && allHandles.length > 0) {
        let x: number | undefined = undefined;
        let y: number | undefined = undefined;
        let scenario: 'direct' | 'collapsed' | 'scroll' | undefined;
        let handle = allHandles.find((handle) => handle.id === handleId);

        // If the handle is present in the current view, return the x and y coordinates
        if (handle) {
          x = handle.x;
          y = handle.y;
          scenario = 'direct';
        } else {
          // If the handle is not present in the current view, check if the parent is collapsed, if yes,

          const nodeFromSchema = schema.find((node) => node.key === getTreeNodeId(handleId));
          if (nodeFromSchema?.pathToRoot) {
            for (const path of nodeFromSchema.pathToRoot) {
              if (openKeys[path.key] === false) {
                handle = allHandles.find((handle) => handle.id === createReactFlowKey(path.key));
                break;
              }
              if (path.key === nodeFromSchema.key) {
                break;
              }
            }
          }

          // If the collapsed parent is in the current view, return x and y coordinates of the parent
          if (handle) {
            x = handle.x;
            y = handle.y;
            scenario = 'collapsed';
          } else {
            // Check if the handle is scrolled out of view,
            // if yes, fetch the x and y coordinates of the temporary handle based on the direction of the scroll
            const firstHandleId = allHandles.find(
              (handle) => handle.id && !isIntermediateNode(handle.id) && !isFunctionNode(handle.id)
            )?.id;
            if (firstHandleId) {
              const indexForFirstHandleInSchema = schema.findIndex((node) => node.key === getTreeNodeId(firstHandleId));
              const indexForNodeInSchema = schema.findIndex((node) => node.key === getTreeNodeId(handleId));
              if (indexForFirstHandleInSchema >= 0 && indexForNodeInSchema >= 0) {
                handle = allHandles.find((handle) =>
                  handle.id?.startsWith(indexForNodeInSchema > indexForFirstHandleInSchema ? 'bottom-' : 'top-')
                );
                if (handle) {
                  x = handle.x;
                  y = handle.y;
                  scenario = 'scroll';
                }
              }
            }
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
      sourceHandles,
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
      targetHandles,
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
    targetHandles,
    sourceHandles,
    flattenendSourceSchema,
    flattenendTargetSchema,
    sourceOpenKeys,
    targetOpenKeys,
  ]);

  return updatedCoordinates;
};

export default useEdgePath;
