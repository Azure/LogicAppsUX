import {
  Badge,
  Text,
  TreeItem,
  TreeItemLayout,
  Tooltip,
  mergeClasses,
  Popover,
  PopoverSurface,
  type PositioningImperativeRef,
} from '@fluentui/react-components';
import { getDurationString } from '@microsoft/designer-ui';
import { type LogicAppsV2, SUBGRAPH_TYPES, equals } from '@microsoft/logic-apps-shared';
import { changePanelNode, setFocusNode, useOperationPanelSelectedNodeId } from '../../../core';
import {
  useRunData,
  useParentRunIndex,
  useRunIndex,
  useNodeMetadata,
  useParentRunIndexes,
} from '../../../core/state/workflow/workflowSelectors';
import {
  collapseGraphsToShowNode,
  clearAllRepetitionRunData,
  updateAgenticMetadata,
  setRunIndex,
  updateAgenticGraph,
} from '../../../core/state/workflow/workflowSlice';
import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useRunTreeViewStyles } from './RunTreeView.styles';
import StatusIndicator from './StatusIndicator';
import { ChatFilled, WrenchFilled } from '@fluentui/react-icons';
import HandoffIcon from '../../../common/images/handoff_icon.svg';
import Markdown from 'react-markdown';

export interface TreeActionItemProps {
  id: string;
  content?: string;
  repetitionName?: string;
  action?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  icon?: string;
  onClick?: () => void;
  treeItemProps?: any;
  data?: any;
}

export const TreeActionItem = ({ id, content, icon, repetitionName, treeItemProps, data }: TreeActionItemProps) => {
  const dispatch = useDispatch();
  const styles = useRunTreeViewStyles();
  const intl = useIntl();

  const rawRunData = useRunData(id);

  const ref = useRef(null);

  const parentRunIndex = useParentRunIndex(id);
  const itemRunIndex = useMemo(() => data.repIndex ?? 0, [data.repIndex]);
  const selectedRunIndexForItem = useRunIndex(id);

  const subgraphType = useNodeMetadata(id)?.subgraphType;

  const isAgentRepetition = useMemo(() => data?.repetition?.type === 'workflows/runs/actions/agentRepetitions', [data?.repetition?.type]);

  const selectedNodeId = useOperationPanelSelectedNodeId();
  const selectedParentRunIndexes = useParentRunIndexes(selectedNodeId);

  const selected = useMemo(() => {
    if (selectedNodeId !== id) {
      return false;
    }
    if (itemRunIndex !== selectedRunIndexForItem) {
      if (subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION) {
        return false;
      }
      if (isAgentRepetition) {
        return false;
      }
    }
    const itemRunIndexes = data?.repetition?.properties?.repetitionIndexes ?? [];
    for (const { scopeName, itemIndex } of itemRunIndexes) {
      if (selectedParentRunIndexes[scopeName] !== itemIndex) {
        return false;
      }
    }
    return true;
  }, [
    data?.repetition?.properties?.repetitionIndexes,
    id,
    itemRunIndex,
    selectedNodeId,
    selectedParentRunIndexes,
    selectedRunIndexForItem,
    subgraphType,
    isAgentRepetition,
  ]);

  useEffect(() => {
    if (selected && ref.current) {
      (ref.current as any).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ref.current]);

  const hasRepetitionData = !!data?.repetition;
  const runData = hasRepetitionData ? data?.repetition?.properties : rawRunData;

  const startTime = useMemo(() => runData?.startTime ?? data?.startTime, [runData, data]);

  const duration = useMemo(() => {
    if (!runData?.startTime) {
      return null;
    }
    if (runData?.endTime && runData?.startTime) {
      return getDurationString(Date.parse(runData.endTime) - Date.parse(runData?.startTime));
    }
    const currentTime = Date.now();
    const activeDuration = getDurationString(currentTime - Date.parse(runData?.startTime ?? ''));

    return activeDuration;
  }, [runData]);

  const onTreeItemSelect = useCallback(
    (id: string, _repetitionName: string) => {
      if (data?.chatMessage) {
        setIsChatPopoverOpen(true);
        return;
      }

      if (selected) {
        return;
      }

      dispatch(collapseGraphsToShowNode(id));
      dispatch(changePanelNode(id));
      dispatch(setFocusNode(id));

      if (isAgentRepetition) {
        // Only update if the repetition index has changed
        if (itemRunIndex !== selectedRunIndexForItem) {
          dispatch(clearAllRepetitionRunData());
          const updatePayload = {
            nodeId: id,
            scopeRepetitionRunData: {
              ...data?.repetition?.properties,
              agentRepetitionName: _repetitionName,
            },
          };
          dispatch(updateAgenticGraph(updatePayload));
          dispatch(updateAgenticMetadata(updatePayload));
          // dispatch(setSubgraphRunData({ nodeId: id, runData: data?.repetition }));
          dispatch(
            setRunIndex({
              nodeId: id,
              page: itemRunIndex ?? 0,
            })
          );
        }
      } else if (
        data?.repetition.type === 'workflows/runs/actions/agentRepetitions/tools' ||
        data?.repetition.type === 'workflows/runs/actions/agentRepetitions/actions'
      ) {
        // Only update parent if the parent repetition index has changed
        const repetitionIndex = data?.repetition?.properties?.repetitionIndexes?.[0];
        const parentRepetition = data?.parentRepetition;
        if (parentRunIndex !== Number(parentRepetition?.name)) {
          dispatch(clearAllRepetitionRunData());
          const updatePayload = {
            nodeId: repetitionIndex?.scopeName ?? '',
            scopeRepetitionRunData: {
              ...parentRepetition?.properties,
              agentRepetitionName: String(repetitionIndex?.itemIndex).padStart(6, '0'),
            },
          };
          dispatch(updateAgenticGraph(updatePayload));
          dispatch(updateAgenticMetadata(updatePayload));
        }

        if (data?.repetition.type === 'workflows/runs/actions/agentRepetitions/tools') {
          // Only update tool if the tool repetition index has changed
          if (itemRunIndex !== selectedRunIndexForItem) {
            dispatch(
              setRunIndex({
                nodeId: id,
                page: itemRunIndex ?? 0,
              })
            );
          }
        }
      }

      // Set the page indexes for any parent scopes
      const repetitionIndexes = data?.repetition?.properties?.repetitionIndexes ?? [];
      repetitionIndexes.forEach((element: any) => {
        dispatch(setRunIndex({ nodeId: element.scopeName, page: element.itemIndex }));
      });
    },
    [itemRunIndex, parentRunIndex, selected, dispatch, data, selectedRunIndexForItem, isAgentRepetition]
  );

  const shortTime = useMemo(() => {
    if (!startTime) {
      return '';
    }
    return intl.formatDate(new Date(Date.parse(startTime)), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // fractionalSecondDigits: 3,
      hour12: false,
    });
  }, [intl, startTime]);

  const longTime = useMemo(() => {
    if (!startTime) {
      return '';
    }
    return intl.formatDate(new Date(Date.parse(startTime)), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
      timeZoneName: 'short',
    });
  }, [intl, startTime]);

  const Icon = () =>
    data?.chatMessage ? (
      <ChatFilled className={mergeClasses(styles.treeItemToolIcon, data?.chatRole === 'User' && styles.userChatIcon)} />
    ) : equals(subgraphType, SUBGRAPH_TYPES.AGENT_CONDITION) ? (
      <WrenchFilled className={styles.treeItemToolIcon} />
    ) : (hasRepetitionData && !data) || !icon ? (
      <div className={styles.treeItemIcon} />
    ) : data?.isHandoff ? (
      <img src={HandoffIcon} alt={id} className={styles.treeItemToolIcon} />
    ) : (
      <img src={icon} alt={id} className={styles.treeItemIcon} />
    );

  const [isChatPopoverOpen, setIsChatPopoverOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const positioningRef = useRef<PositioningImperativeRef>(null);

  useEffect(() => {
    if (contentRef.current) {
      positioningRef.current?.setTarget(contentRef.current);
    }
  }, [contentRef, positioningRef]);

  return (
    <TreeItem
      {...treeItemProps}
      id={`#treeitem-${id}${repetitionName ? `-#${repetitionName}` : ''}`}
      onClick={() => onTreeItemSelect(id, repetitionName ?? '')}
      ref={ref}
    >
      <TreeItemLayout
        ref={contentRef}
        className={mergeClasses(selected ? styles.treeItemSelected : styles.treeItem)}
        aside={
          startTime ? (
            <Tooltip relationship="label" content={longTime}>
              <Badge appearance="ghost" color="informative">
                {shortTime}
              </Badge>
            </Tooltip>
          ) : null
        }
      >
        {selected ? <div className={styles.selectionIndicator} /> : null}
        <div className={styles.treeItemContent}>
          <Icon />
          <Text>{content}</Text>
          {runData?.status ? <StatusIndicator status={runData.status} /> : undefined}
          {duration ? (
            <Badge appearance="outline" color="informative">
              {duration}
            </Badge>
          ) : null}
        </div>
        <Popover
          open={isChatPopoverOpen}
          onOpenChange={(e, data) => setIsChatPopoverOpen(data.open)}
          positioning={{
            positioningRef,
            // align: 'end',
            position: 'after',
          }}
        >
          <PopoverSurface style={{ maxWidth: '320px', maxHeight: '480px', overflow: 'auto' }}>
            <div className={styles.treeItemContent} style={{ marginBottom: '32px' }}>
              <Icon />
              <Text>{content}</Text>
            </div>
            <div style={{ margin: '-16px 0px' }}>
              <Markdown>{data?.chatMessage}</Markdown>
            </div>
          </PopoverSurface>
        </Popover>
      </TreeItemLayout>
    </TreeItem>
  );
};
