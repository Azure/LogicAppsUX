import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback, useEffect, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useSetNodeContextMenuData } from '../../core/state/designerView/DesignerViewContext';
import { setFocusNode, type AppDispatch, type RootState } from '../../core';
import { useDispatch, useSelector } from 'react-redux';
import { useCollapsedMapping, useIsActionCollapsed, useShouldNodeFocus } from '../../core/state/workflow/workflowSelectors';
import { isNullOrUndefined, useNodeIndex } from '@microsoft/logic-apps-shared';
import { useOperationsVisuals } from '../../core/state/operation/operationSelector';
import { DefaultHandle } from './components/handles/DefaultHandle';

const CollapsedNode = ({ id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const collapsedMapping = useCollapsedMapping();
  const isNodeCollapsed = useIsActionCollapsed(id);
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusCollapsedNodeId);
  const shouldFocus = useShouldNodeFocus(id);
  const nodeIndex = useNodeIndex(id);

  const actionCount = useMemo(() => {
    const collapsedNode = collapsedMapping[id];
    return (collapsedNode?.length ?? 0) - 2;
  }, [collapsedMapping, id]);

  const collapsedActions = useMemo(() => {
    return [id, ...(collapsedMapping[id] ?? [])].slice(0, 3);
  }, [collapsedMapping, id]);

  const actionVisuals = useOperationsVisuals(collapsedActions);

  useEffect(() => {
    if (id === focusNodeId) {
      dispatch(setFocusNode(id));
    }
  }, [dispatch, focusNodeId, id]);

  const setNodeContextMenuData = useSetNodeContextMenuData();
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setNodeContextMenuData({
        nodeId: id,
        location: {
          x: e.clientX,
          y: e.clientY,
        },
      });
    },
    [setNodeContextMenuData, id]
  );

  return (
    <div
      style={{
        width: 200,
        height: 50,
      }}
    >
      <DefaultHandle type="target" />
      <CollapsedCard
        id={id}
        actionCount={actionCount}
        onContextMenu={onContextMenu}
        operationVisuals={actionVisuals}
        isExpanding={isNullOrUndefined(isNodeCollapsed)}
        setFocus={shouldFocus}
        nodeIndex={nodeIndex}
      />
      <DefaultHandle type="source" />
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
