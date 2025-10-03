import { setLayerHostSelector } from '@fluentui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNodesMetadata, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { useRunTreeViewStyles } from './RunTreeView.styles';
import type { HeadlessFlatTreeItemProps, TreeItemValue, TreeOpenChangeData, TreeOpenChangeEvent } from '@fluentui/react-components';
import { FlatTree, Spinner, useHeadlessFlatTree_unstable, useRestoreFocusTarget } from '@fluentui/react-components';
import { useAllIcons } from '../../../core/state/operation/operationSelector';
import { getAgentActionsRepetition, getAgentRepetitions, getNodeRepetitions } from '../../../core';
import { equals, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useAllOperations } from '../../../core/state/selectors/actionMetadataSelector';
import { useIntl } from 'react-intl';
import { useTimelineRepetitions } from '../../MonitoringTimeline/hooks';
import { TreeActionItem } from './TreeActionItem';

export const RunTreeView = () => {
  const intl = useIntl();
  const styles = useRunTreeViewStyles();

  const runningText = intl.formatMessage({
    defaultMessage: 'Workflow is running',
    id: 'qaE+ry',
    description: 'Text shown when a run is in progress',
  });

  const selectedRun = useRunInstance() as LogicAppsV2.RunInstanceDefinition | undefined;
  const icons = useAllIcons();

  const nodesMetadata = useNodesMetadata();
  const operationsInfo = useAllOperations();

  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);

  const actions = useMemo(() => {
    const trigger = selectedRun?.properties.trigger;
    return {
      [trigger?.name ?? '']: trigger,
      ...selectedRun?.properties.actions,
    };
  }, [selectedRun?.properties.actions, selectedRun?.properties.trigger]);

  const isRunning =
    selectedRun?.properties.status === 'Running' ||
    selectedRun?.properties.status === 'Waiting' ||
    selectedRun?.properties.status === 'Resuming';

  const { data: agentRepetitionData } = useTimelineRepetitions();

  const [openItems, setOpenItems] = useState<Set<TreeItemValue>>(new Set());

  const onOpenChange = useCallback((_e: TreeOpenChangeEvent, data: TreeOpenChangeData) => {
    // Prevent clicks from toggling open state
    if (data.type === 'Click' || data.type === 'Enter') {
      _e.preventDefault();
      _e.stopPropagation();
      return;
    }
    setOpenItems(data.openItems);
  }, []);

  const [treeItemsRecord, setTreeItemsRecord] = useState<Record<string, FlatItem>>({});
  const addTreeItem = useCallback((item: FlatItem) => {
    setOpenItems((prev) => new Set(prev).add(item.parentValue ?? item.value));
    setTreeItemsRecord((prev) => ({
      ...prev,
      [item.value]: item,
    }));
  }, []);

  // Reset tree items when run changes
  useEffect(() => {
    setTreeItemsRecord({});
  }, [selectedRun?.id]);

  // Build the tree
  useEffect(() => {
    if (!actions) {
      return;
    }

    const countRecord: Record<string, number> = {};
    const getCountRecord = (id: string) => countRecord[id] ?? 0;
    const addToCountRecord = (id: string) => {
      if (countRecord[id] === undefined) {
        countRecord[id] = 1;
      } else {
        countRecord[id]++;
      }
    };

    // Stateful nodes
    Object.entries(actions).forEach(([id, action]) => {
      let parentNodeId = nodesMetadata?.[id]?.parentNodeId ?? 'root';
      if (nodesMetadata?.[parentNodeId]?.subgraphType) {
        parentNodeId = nodesMetadata?.[parentNodeId]?.parentNodeId ?? 'root';
      }

      // Normal scopes
      if ((action?.repetitionCount ?? 0) > 0) {
        getNodeRepetitions(id, selectedRun!.id).then((repetitions) => {
          repetitions.forEach((repetition) => {
            if (repetition?.properties.status === 'Skipped') {
              return;
            }

            const repetitionName = repetition.name;

            const newId = `${id}-#${repetitionName}`;
            const indexes = repetition.properties.repetitionIndexes;
            const underIndexedScope = indexes?.some((scope) => equals(scope.scopeName, parentNodeId));

            // Remove the last 7 characters from the repetition name if under indexed scope
            const parentRepetitionName = underIndexedScope
              ? repetitionName.length > 6
                ? repetitionName.slice(0, -7)
                : ''
              : repetitionName;
            const parentId = parentRepetitionName ? `${parentNodeId}-#${parentRepetitionName}` : parentNodeId;

            // Add new repetition node
            const newTreeData = {
              value: newId,
              ...(parentId !== 'root' ? { parentValue: parentId } : {}),
              content: id,
              data: {
                repIndex: Number(repetitionName),
                repetition,
                startTime: repetition.properties?.startTime,
              },
            };
            addToCountRecord(id);
            addTreeItem(newTreeData);
          });
        });
      } else if ((action?.iterationCount ?? 0) > 0) {
        // Agent scopes
        getAgentRepetitions(id, selectedRun!.id).then((repetitions) => {
          repetitions.forEach((agentRepetition) => {
            if (agentRepetition?.properties.status === 'Skipped') {
              return;
            }

            const repetitionName = agentRepetition.name;

            const newAgentId = `${id}-#${repetitionName}`;
            const indexes = agentRepetition.properties.repetitionIndexes;
            const underIndexedScope = indexes?.some((scope) => equals(scope.scopeName, parentNodeId));

            // Remove the last 7 characters from the repetition name if under indexed scope
            const parentRepetitionName = underIndexedScope
              ? repetitionName.length > 6
                ? repetitionName.slice(0, -7)
                : ''
              : repetitionName;
            const parentId = parentRepetitionName ? `${parentNodeId}-#${parentRepetitionName}` : parentNodeId;

            // Add new repetition node
            const newTreeData = {
              value: newAgentId,
              ...(parentNodeId !== 'root' ? { parentValue: parentId } : {}),
              content: id,
              data: {
                repIndex: Number(repetitionName),
                repetition: agentRepetition,
                startTime: agentRepetition.properties?.startTime,
              },
            };
            addToCountRecord(id);
            addTreeItem(newTreeData);

            // Also add any tools
            const tools = (agentRepetition?.properties as any)?.tools ?? {};
            Object.entries(tools).forEach(([toolId, toolData]: [string, any]) => {
              for (let i = 0; i < toolData.iterations; i++) {
                const toolRepetitionId = `${toolId}-#${repetitionName}-${repIndexToName(i)}`;
                // Add new repetition node
                const newToolTreeData = {
                  value: toolRepetitionId,
                  content: toolId,
                  parentValue: newAgentId,
                  data: {
                    repIndex: i,
                    repetition: {
                      id: toolRepetitionId,
                      name: toolId,
                      properties: {
                        repetitionIndexes: [
                          {
                            scopeName: id,
                            itemIndex: Number(repetitionName),
                          },
                        ],
                      },
                      type: 'workflows/runs/actions/agentRepetitions/tools',
                    },
                    parentRepetition: agentRepetition,
                  },
                };
                addToCountRecord(toolId);
                addTreeItem(newToolTreeData);
              }
            });

            // Get actions within the agent, and place them under tools
            getAgentActionsRepetition(id, selectedRun!.id, repetitionName, 0).then((actionsRepetition) => {
              actionsRepetition.forEach((actionRepetition) => {
                const actions = (actionRepetition.properties as any)?.actionResults ?? [];
                actions.forEach((action: any) => {
                  const actionId = action?.name;
                  const leafRepetitionIndex = getCountRecord(actionId);
                  const newActionId = `${actionId}-#${repIndexToName(leafRepetitionIndex)}`;
                  const parentId = nodesMetadata?.[actionId]?.graphId ?? 'root';
                  const parentRepetitionId = `${parentId}-#${repetitionName}-${repIndexToName(leafRepetitionIndex)}`;
                  // Add new repetition node
                  const newTreeData = {
                    value: newActionId,
                    content: actionId ?? '',
                    parentValue: parentRepetitionId,
                    data: {
                      repetition: {
                        id: newActionId,
                        name: actionId,
                        properties: {
                          ...action,
                          repetitionIndexes: [
                            {
                              scopeName: id,
                              itemIndex: Number(repetitionName),
                            },
                            {
                              scopeName: parentId,
                              itemIndex: leafRepetitionIndex,
                            },
                          ],
                        },
                        type: 'workflows/runs/actions/agentRepetitions/actions',
                      },
                      parentRepetition: agentRepetition,
                      startTime: action?.startTime,
                    },
                  };
                  addToCountRecord(actionId);
                  addTreeItem(newTreeData);
                  // Reassign start / end times to the parent tool if needed
                  setTreeItemsRecord((prev) => {
                    const currentParentStartTime = prev[parentRepetitionId]?.data?.startTime ?? 0;
                    const currentParentEndTime = prev[parentRepetitionId]?.data?.endTime ?? 0;
                    if (action?.startTime > currentParentStartTime && action?.endTime < currentParentEndTime) {
                      return prev;
                    }
                    const newStartTime =
                      action?.startTime && (!currentParentStartTime || action?.startTime < currentParentStartTime)
                        ? action.startTime
                        : currentParentStartTime;
                    const newEndTime =
                      action?.endTime && (!currentParentEndTime || action?.endTime > currentParentEndTime)
                        ? action.endTime
                        : currentParentEndTime;
                    return {
                      ...prev,
                      [parentRepetitionId]: {
                        ...prev[parentRepetitionId],
                        data: {
                          ...prev[parentRepetitionId].data,
                          repetition: {
                            ...prev[parentRepetitionId].data.repetition,
                            properties: {
                              ...prev[parentRepetitionId].data.repetition.properties,
                              startTime: newStartTime,
                              endTime: newEndTime,
                            },
                          },
                          startTime: newStartTime,
                          endTime: newEndTime,
                        },
                      },
                    };
                  });
                });
              });
            });
          });
        });
      } else if (action) {
        // Normal actions
        if (action?.status === 'Skipped') {
          return;
        }

        const newTreeData = {
          value: id,
          ...(parentNodeId !== 'root' ? { parentValue: parentNodeId } : {}),
          content: id,
          data: {
            startTime: action?.startTime,
          },
        };
        addTreeItem(newTreeData);
      }
    });

    // A2A agents
    (agentRepetitionData ?? []).forEach((agentRepetition, agentIndex: number) => {
      if (agentRepetition?.properties.status === 'Skipped') {
        return;
      }
      const agentName = agentRepetition.properties.agentMetadata?.agentName;
      const newAgentId = `${agentName}-#${agentRepetition.name}`;

      getAgentActionsRepetition(agentName, selectedRun!.id, agentRepetition.name, 0).then((actionsRepetition) => {
        actionsRepetition.forEach((actionRepetition, actionIndex: number) => {
          const actions = (actionRepetition.properties as any)?.actionResults ?? [];
          actions.forEach((action: any) => {
            const actionId = action?.name;
            const newActionId = `${actionId}-#${repIndexToName(agentIndex)}-${repIndexToName(actionIndex)}`;
            // Add new repetition node
            const newTreeData = {
              value: newActionId,
              content: actionId ?? '',
              parentValue: newAgentId,
              data: {
                repetition: {
                  id: newActionId,
                  name: actionId,
                  properties: {
                    ...action,
                    repetitionIndexes: [
                      {
                        scopeName: agentName,
                        itemIndex: Number(agentRepetition.name),
                      },
                    ],
                  },
                  type: 'workflows/runs/actions/agentRepetitions/actions',
                },
                parentRepetition: agentRepetition,
                startTime: action?.startTime,
              },
            };
            addTreeItem(newTreeData);
          });
        });
      });

      // Add new repetition node
      const newTreeData = {
        value: newAgentId,
        content: agentName ?? '',
        data: {
          repIndex: Number(agentRepetition.name),
          repetition: agentRepetition,
          startTime: agentRepetition.properties?.startTime,
        },
      };
      addTreeItem(newTreeData);
    });
  }, [actions, nodesMetadata, operationsInfo, selectedRun, agentRepetitionData, addTreeItem]);

  const treeItems = useMemo(() => {
    return Object.values(treeItemsRecord).sort((a, b) => {
      return a.data.startTime && b.data.startTime ? new Date(a.data.startTime).getTime() - new Date(b.data.startTime).getTime() : 0;
    });
  }, [treeItemsRecord]);

  const flatTree = useHeadlessFlatTree_unstable(treeItems, {
    onOpenChange,
    openItems,
  });
  const focusTargetAttribute = useRestoreFocusTarget();

  if (!selectedRun) {
    return null;
  }

  return (
    <>
      <FlatTree {...flatTree.getTreeProps()} aria-label="Flat Tree">
        {Array.from(flatTree.items(), (flatTreeItem) => {
          const [actionId, repetitionName] = (flatTreeItem.value as string).split('-#');
          return (
            <TreeActionItem
              key={flatTreeItem.value}
              treeItemProps={{
                ...focusTargetAttribute,
                ...flatTreeItem.getTreeItemProps(),
              }}
              id={actionId}
              repetitionName={repetitionName}
              action={actions[actionId]}
              icon={icons[actionId]}
              data={treeItemsRecord[flatTreeItem.value]?.data}
            />
          );
        })}
      </FlatTree>
      {isRunning ? <Spinner className={styles.runningSpinner} size="extra-tiny" labelPosition="after" label={runningText} /> : null}
    </>
  );
};

type FlatItem = HeadlessFlatTreeItemProps & { content: string; data?: any };

const repIndexToName = (index: number) => String(index).padStart(6, '0');
