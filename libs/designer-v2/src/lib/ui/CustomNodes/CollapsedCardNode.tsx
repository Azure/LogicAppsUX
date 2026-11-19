import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { setNodeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import { setFocusNode, type AppDispatch, type RootState } from '../../core';
import { useDispatch, useSelector } from 'react-redux';
import {
  useCollapsedMapping,
  useIsActionCollapsed,
  useNodeDisplayName,
  useShouldNodeFocus,
} from '../../core/state/workflow/workflowSelectors';
import {
  containsIdTag,
  isNullOrUndefined,
  replaceWhiteSpaceWithUnderscore,
  useNodeIndex,
  WORKFLOW_NODE_TYPES,
} from '@microsoft/logic-apps-shared';
import { useOperationsVisuals } from '../../core/state/operation/operationSelector';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { COLLAPSED_NODE_SIZE, getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import { CollapseChip, compactNodeMetrics } from '@microsoft/designer-ui-v2';
import { BoxMultipleRegular, PlugConnectedRegular } from '@fluentui/react-icons';
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
  const handleAxis = data?.handleAxis === 'horizontal' ? 'horizontal' : 'vertical';
  const focusRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTarget = useRestoreFocusTarget();
  const intl = useIntl();
  const title = useNodeDisplayName(id);

  const actionCount = useMemo(() => {
    const collapsedNode = collapsedMapping[id];
    return (collapsedNode?.length ?? 0) - 2;
  }, [collapsedMapping, id]);

  const summaryIds = useMemo(
    () => [...new Set([id, ...(collapsedMapping[id] ?? [])])].filter((actionId) => !containsIdTag(actionId)),
    [collapsedMapping, id]
  );
  const collapsedActions = useMemo(
    () => (presentation.shared ? summaryIds.slice(0, 4) : [id, ...(collapsedMapping[id] ?? [])].slice(0, 3)),
    [collapsedMapping, id, presentation.shared, summaryIds]
  );

  const actionVisuals = useOperationsVisuals(collapsedActions);
  const collapsedCount = summaryIds.length;

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
        width: presentation.size?.width ?? (presentation.shared ? compactNodeMetrics.card.width : COLLAPSED_NODE_SIZE.width),
        height: presentation.size?.height ?? (presentation.shared ? compactNodeMetrics.card.wrappedHeight : COLLAPSED_NODE_SIZE.height),
      }}
    >
      <DefaultHandle axis={handleAxis} type="target" />
      {presentation.shared ? (
        <CollapseChip
          {...restoreFocusTarget}
          ref={focusRef}
          id={`msla-collapsed-card-${replaceWhiteSpaceWithUnderscore(id)}`}
          data-automation-id={`msla-collapsed-card-${replaceWhiteSpaceWithUnderscore(id)}`}
          collapsed
          count={collapsedCount}
          summary={{
            title,
            icon: actionVisuals[0]?.iconUri ? <img src={actionVisuals[0].iconUri} alt="" /> : <BoxMultipleRegular />,
            thumbnails: actionVisuals.slice(1).map(({ id, iconUri }) => ({
              id,
              icon: iconUri ? <img src={iconUri} alt="" /> : <PlugConnectedRegular />,
            })),
            countLabel: { count: collapsedCount, unit: 'actions' },
            strings: {
              actionCount: (count) =>
                intl.formatMessage(
                  {
                    defaultMessage: '{count, plural, one {# action} other {# actions}}',
                    id: '6Uhvxj',
                    description: 'Number of actions in a collapsed action group',
                  },
                  { count }
                ),
            },
          }}
          onToggle={() => dispatch(toggleCollapsedActionId(id))}
          onContextMenu={onContextMenu}
          tabIndex={nodeIndex}
          disabled={isNullOrUndefined(isNodeCollapsed)}
          aria-label={intl.formatMessage(
            {
              defaultMessage: '{title}: {count, plural, one {show # action} other {show # actions}}',
              id: 'SH7TsH',
              description: 'Accessible name for expanding a collapsed action group',
            },
            { title, count: collapsedCount }
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
      <DefaultHandle axis={handleAxis} type="source" />
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
