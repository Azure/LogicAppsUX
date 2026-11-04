import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { setNodeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import { setFocusNode, type AppDispatch, type RootState } from '../../core';
import { useDispatch, useSelector } from 'react-redux';
import { useCollapsedMapping, useIsActionCollapsed, useShouldNodeFocus } from '../../core/state/workflow/workflowSelectors';
import { isNullOrUndefined, replaceWhiteSpaceWithUnderscore, useNodeIndex, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useOperationsVisuals } from '../../core/state/operation/operationSelector';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import { CollapseChip } from '@microsoft/designer-ui-v2';
import { toggleCollapsedActionId } from '../../core/state/workflow/workflowSlice';
import { useIntl } from 'react-intl';
import { useRestoreFocusTarget } from '@fluentui/react-components';

const CollapsedNode = ({ id, data }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const collapsedMapping = useCollapsedMapping();
  const isNodeCollapsed = useIsActionCollapsed(id);
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusCollapsedNodeId);
  const shouldFocus = useShouldNodeFocus(id);
  const nodeIndex = useNodeIndex(id);
  const sharedOption = useSharedNodeUi();
  const presentation =
    (data?.presentation as NodePresentation | undefined) ?? getNodePresentation(WORKFLOW_NODE_TYPES.COLLAPSED_NODE, sharedOption);
  const focusRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTarget = useRestoreFocusTarget();
  const intl = useIntl();

  const actionCount = useMemo(() => {
    const collapsedNode = collapsedMapping[id];
    return (collapsedNode?.length ?? 0) - 2;
  }, [collapsedMapping, id]);

  const collapsedActions = useMemo(() => {
    return [id, ...(collapsedMapping[id] ?? [])].slice(0, 3);
  }, [collapsedMapping, id]);

  const actionVisuals = useOperationsVisuals(collapsedActions);
  const collapsedCount = new Set([id, ...(collapsedMapping[id] ?? [])]).size;

  useEffect(() => {
    if (id === focusNodeId) {
      dispatch(setFocusNode(id));
    }
  }, [dispatch, focusNodeId, id]);
  useEffect(() => {
    if (presentation.shared && shouldFocus) {
      focusRef.current?.focus({ preventScroll: true });
    }
  }, [presentation.shared, shouldFocus]);

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
        width: presentation.size?.width ?? 200,
        height: 50,
      }}
    >
      <DefaultHandle type="target" />
      {presentation.shared ? (
        <CollapseChip
          {...restoreFocusTarget}
          ref={focusRef}
          id={`msla-collapsed-card-${replaceWhiteSpaceWithUnderscore(id)}`}
          data-automation-id={`msla-collapsed-card-${replaceWhiteSpaceWithUnderscore(id)}`}
          collapsed
          count={collapsedCount}
          onToggle={() => dispatch(toggleCollapsedActionId(id))}
          onContextMenu={onContextMenu}
          tabIndex={nodeIndex}
          disabled={isNullOrUndefined(isNodeCollapsed)}
          aria-label={intl.formatMessage(
            { defaultMessage: 'Show {count} actions', id: 'wQQ2zw', description: 'Expand collapsed actions' },
            { count: collapsedCount }
          )}
        />
      ) : (
        <CollapsedCard
          id={id}
          actionCount={actionCount}
          onContextMenu={onContextMenu}
          operationVisuals={actionVisuals}
          isExpanding={isNullOrUndefined(isNodeCollapsed)}
          setFocus={shouldFocus}
          nodeIndex={nodeIndex}
        />
      )}
      <DefaultHandle type="source" />
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
