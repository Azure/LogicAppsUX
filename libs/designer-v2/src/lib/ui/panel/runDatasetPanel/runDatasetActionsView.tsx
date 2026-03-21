import { useCallback, useMemo } from 'react';
import {
  Badge,
  Caption1Strong,
  FlatTree,
  Text,
  TreeItem,
  TreeItemLayout,
  mergeClasses,
  useHeadlessFlatTree_unstable,
  type HeadlessFlatTreeItemProps,
} from '@fluentui/react-components';
import { useAgentOperations, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { useRunTreeViewStyles } from '../runTreeView/RunTreeView.styles';
import StatusIndicator from '../runHistoryPanel/statusIndicator';
import { idDisplayCase, toFriendlyDurationString, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { setSelectedAgentName } from '../../../core/state/evaluation/evaluationSlice';
import { useSelectedEvaluationAgentName } from '../../../core/state/evaluation/evaluationSelectors';

export const RunDatasetActionsView = () => {
  const intl = useIntl();
  const styles = useRunTreeViewStyles();
  const dispatch = useDispatch();

  const selectedRun = useRunInstance() as LogicAppsV2.RunInstanceDefinition | undefined;
  const agentOperations = useAgentOperations();
  const selectedAgentName = useSelectedEvaluationAgentName();

  const noActionsText = intl.formatMessage({
    defaultMessage: 'No agent actions found',
    description: 'Text shown when no agent actions are found in the run',
    id: 'xLYNud',
  });

  const agentActions = useMemo(() => {
    if (!selectedRun?.properties.actions) {
      return {};
    }
    return agentOperations.reduce((result: Record<string, LogicAppsV2.WorkflowRunAction>, nodeId: string) => {
      const action = selectedRun.properties.actions[nodeId];
      if (action) {
        result[nodeId] = action;
      }
      return result;
    }, {});
  }, [selectedRun?.properties.actions, agentOperations]);

  const actionIds = useMemo(() => Object.keys(agentActions), [agentActions]);

  const treeItems: HeadlessFlatTreeItemProps[] = useMemo(() => actionIds.map((id) => ({ value: id })), [actionIds]);

  const flatTree = useHeadlessFlatTree_unstable(treeItems);

  const handleActionClick = useCallback(
    (nodeId: string) => {
      dispatch(setSelectedAgentName(selectedAgentName === nodeId ? null : nodeId));
    },
    [dispatch, selectedAgentName]
  );

  if (!selectedRun) {
    return null;
  }

  if (actionIds.length === 0) {
    return (
      <Text align="center" style={{ padding: '16px' }}>
        {noActionsText}
      </Text>
    );
  }

  return (
    <FlatTree {...flatTree.getTreeProps()} aria-label="Agent actions">
      {Array.from(flatTree.items(), (flatTreeItem) => {
        const nodeId = flatTreeItem.value as string;
        const action = agentActions[nodeId];
        const isSelected = selectedAgentName === nodeId;
        const durationString =
          action?.startTime && action?.endTime
            ? toFriendlyDurationString(new Date(action.startTime), new Date(action.endTime), intl)
            : undefined;
        return (
          <TreeItem key={nodeId} {...flatTreeItem.getTreeItemProps()} onClick={() => handleActionClick(nodeId)}>
            <TreeItemLayout
              className={mergeClasses(isSelected ? styles.treeItemSelected : styles.treeItem)}
              aside={
                durationString ? (
                  <Badge size="small" color="informative" appearance="ghost">
                    {durationString}
                  </Badge>
                ) : null
              }
            >
              {isSelected && <div className={styles.selectionIndicator} />}
              <div className={styles.treeItemContent}>
                <StatusIndicator status={action?.status} onlyIcon />
                <Caption1Strong truncate wrap={false}>
                  {idDisplayCase(nodeId)}
                </Caption1Strong>
              </div>
            </TreeItemLayout>
          </TreeItem>
        );
      })}
    </FlatTree>
  );
};
