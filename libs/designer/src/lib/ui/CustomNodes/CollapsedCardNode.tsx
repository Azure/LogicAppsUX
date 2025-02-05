import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { setNodeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import type { AppDispatch } from '../../core';
import { useDispatch } from 'react-redux';
import { useCollapsedMapping, useIsActionCollapsed } from '../../core/state/workflow/workflowSelectors';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useOperationsVisuals } from '../../core/state/operation/operationSelector';

const CollapsedNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const collapsedMapping = useCollapsedMapping();
  const isNodeCollapsed = useIsActionCollapsed(id);

  const actionCount = useMemo(() => {
    const collapsedNode = collapsedMapping[id];
    return (collapsedNode?.length ?? 0) - 2;
  }, [collapsedMapping, id]);

  const collapsedActions = useMemo(() => {
    return [id, ...(collapsedMapping[id] ?? [])].slice(0, 3);
  }, [collapsedMapping, id]);

  const actionVisuals = useOperationsVisuals(collapsedActions);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: id,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, id]
  );

  return (
    <div
      style={{
        width: 200,
        height: 50,
      }}
    >
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <CollapsedCard
        operationVisuals={actionVisuals}
        id="testId"
        actionCount={actionCount}
        onContextMenu={onContextMenu}
        isExpanding={isNullOrUndefined(isNodeCollapsed)}
      />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
