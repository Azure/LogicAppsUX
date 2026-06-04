import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { batch, useDispatch } from 'react-redux';
import {
  Popover,
  PopoverSurface,
  MenuList,
  MenuItem,
  Tooltip,
  MenuDivider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuSplitGroup,
} from '@fluentui/react-components';
import {
  LogEntryLevel,
  LoggerService,
  UiInteractionsService,
  agentOperation,
  customLengthGuid,
  equals,
  guid,
  isUiInteractionsServiceEnabled,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
} from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useOnViewportChange } from '@xyflow/react';

import { useIsAgenticWorkflow, useEdgeContextMenuData, useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useEnableNestedAgentLoops } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { addOperation, useNodeDisplayName, useNodeMetadata, type AppDispatch } from '../../../core';
import { changePanelNode, expandDiscoveryPanel, setSelectedPanelActiveTab } from '../../../core/state/panel/panelSlice';
import { retrieveClipboardData } from '../../../core/utils/clipboard';
import { CustomMenu } from './customMenu';

import {
  BotAdd24Filled,
  BotAdd24Regular,
  ArrowBetweenDown24Filled,
  ArrowBetweenDown24Regular,
  ArrowSplit24Filled,
  ArrowSplit24Regular,
  ClipboardPasteFilled,
  ClipboardPasteRegular,
  EditFilled,
  EditRegular,
  DeleteFilled,
  DeleteRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { pasteOperation, pasteScopeOperation } from '../../../core/actions/bjsworkflow/copypaste';
import { useUpstreamNodes } from '../../../core/state/tokens/tokenSelectors';
import { useHandoffActionsForAgent, useHasUpstreamAgenticLoop, useIsAgentLoop } from '../../../core/state/workflow/workflowSelectors';
import { addRunAfter, removeRunAfter } from '../../../core/state/workflow/workflowSlice';
import { addAgentHandoff, removeAgentHandoff } from '../../../core/actions/bjsworkflow/handoff';
import { removeOperationRunAfter } from '../../../core/actions/bjsworkflow/runafter';
import constants from '../../../common/constants';

const AddIcon = bundleIcon(ArrowBetweenDown24Filled, ArrowBetweenDown24Regular);
const ParallelIcon = bundleIcon(ArrowSplit24Filled, ArrowSplit24Regular);
const ClipboardIcon = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);
const AgentIcon = bundleIcon(BotAdd24Filled, BotAdd24Regular);
const EditIcon = bundleIcon(EditFilled, EditRegular);
const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

export const EdgeContextualMenu = () => {
  const intl = useIntl();

  const menuData = useEdgeContextMenuData();
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const isA2AWorkflow = useIsA2AWorkflow();
  const enableNestedAgentLoops = useEnableNestedAgentLoops();
  const graphId = useMemo(() => menuData?.graphId, [menuData]);
  const parentId = useMemo(() => menuData?.parentId, [menuData]);
  const childId = useMemo(() => menuData?.childId, [menuData]);
  const isLeaf = useMemo(() => menuData?.isLeaf, [menuData]);
  const location = useMemo(() => menuData?.location, [menuData]);
  const isHandoff = useMemo(() => menuData?.isHandoff, [menuData]);

  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => setOpen(!!menuData), [menuData]);

  useOnViewportChange({
    onStart: useCallback(() => open && setOpen?.(false), [open, setOpen]),
  });

  const [copiedNode, setCopiedNode] = useState<any>(null);
  useEffect(() => {
    (async () => {
      if (!open) {
        return;
      }
      const data = await retrieveClipboardData();
      setCopiedNode(data);
    })();
  }, [open]);

  const nodeMetadata = useNodeMetadata(removeIdTag(parentId ?? ''));
  // For subgraph nodes, we want to use the id of the scope node as the parentId to get the dependancies
  const newParentId = useMemo(() => {
    if (nodeMetadata?.subgraphType) {
      return nodeMetadata.parentNodeId;
    }
    return parentId;
  }, [nodeMetadata, parentId]);

  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? newParentId ?? ''), graphId, childId);
  const upstreamNodesOfParent = useUpstreamNodes(removeIdTag(newParentId ?? ''), graphId, newParentId);
  const hasUpstreamAgenticLoop = useHasUpstreamAgenticLoop(isLeaf ? upstreamNodesOfChild : upstreamNodesOfParent);

  const isAddAgentHandoff = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;
  const isAddActionDisabled = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;
  const isAddParallelBranchDisabled = (isA2AWorkflow && graphId === 'root') || isLeaf;
  const isPasteDisabledForUpstreamAgent = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;
  const isPasteDisabledForNonRootAgent = graphId !== 'root' && equals(copiedNode?.serializedOperation?.type, 'agent');

  const dispatch = useDispatch<AppDispatch>();

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    if (!graphId) {
      return;
    }
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(
      expandDiscoveryPanel({
        nodeId: newId,
        relationshipIds,
        isParallelBranch: true,
      })
    );
    LoggerService().log({
      area: 'DropZone:addParallelBranch',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new parallel branch node.',
    });
  }, [dispatch, graphId, parentId]);

  const parentIsAgent = useIsAgentLoop(parentId);
  const childIsAgent = useIsAgentLoop(childId);

  const addAgenticLoop = useCallback(
    ({ parallel = false }: any) => {
      if (!graphId) {
        return;
      }

      const newAgentId = `Agent_${customLengthGuid(4)}`;

      const relationshipIds = { graphId, childId, parentId };
      if (parallel && relationshipIds?.childId) {
        delete relationshipIds.childId;
      }
      dispatch(addOperation({ nodeId: newAgentId, relationshipIds, operation: agentOperation }));

      if (isA2AWorkflow) {
        if (parentId && parentIsAgent) {
          // If the parent is an agent, remove the connecting edge and replace it with a handoff
          dispatch(
            removeOperationRunAfter({
              parentOperationId: parentId,
              childOperationId: newAgentId,
            })
          );
          dispatch(addAgentHandoff({ sourceId: parentId, targetId: newAgentId }));
        }
        if (!parallel && childId && childIsAgent) {
          // If the child is an agent, remove the connecting edge and replace it with a handoff
          dispatch(
            removeOperationRunAfter({
              parentOperationId: newAgentId,
              childOperationId: childId,
            })
          );
          dispatch(addAgentHandoff({ sourceId: newAgentId, targetId: childId }));
        }
      }
    },
    [childId, childIsAgent, dispatch, graphId, isA2AWorkflow, parentId, parentIsAgent]
  );

  const editHandoff = useCallback(() => {
    batch(() => {
      dispatch(changePanelNode(parentId ?? ''));
      dispatch(setSelectedPanelActiveTab(constants.PANEL_TAB_NAMES.HANDOFF));
    });
  }, [dispatch, parentId]);

  const handoffActions = useHandoffActionsForAgent(parentId ?? '');

  const deleteHandoff = useCallback(() => {
    const toolId = handoffActions?.find((action) => action.targetId === childId)?.toolId;
    dispatch(removeAgentHandoff({ agentId: parentId ?? '', toolId }));
  }, [handoffActions, dispatch, parentId, childId]);

  // const deleteRunAfter = useCallback(() => {
  //   dispatch(
  //     removeOperationRunAfter({
  //       parentOperationId: parentId ?? '',
  //       childOperationId: childId ?? '',
  //     })
  //   );
  // }, [dispatch, parentId, childId]);

  const newActionText = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: 'mCzkXX',
    description: 'Text for button to add a new action',
  });

  const newBranchText = intl.formatMessage({
    defaultMessage: 'Add a parallel branch',
    id: 'LZm3ze',
    description: 'Text for button to add a parallel branch',
  });

  const newAgentText = intl.formatMessage({
    defaultMessage: 'Add an agent',
    id: 'hj/ald',
    description: 'Button text for adding an agent',
  });

  const newHandOffAgentText = intl.formatMessage({
    defaultMessage: 'Add a hand-off agent',
    id: '1YUi9I',
    description: 'Text for button to add an agent',
  });

  const pasteNodeCount = copiedNode?.isMultiNode ? (copiedNode.nodes?.length ?? 1) : 1;

  const pasteFromClipboard = intl.formatMessage(
    {
      defaultMessage: '{count, plural, one {Paste an action} other {Paste {count} actions}}',
      id: 'gW99On',
      description: 'Text for button to paste one or more actions from clipboard',
    },
    { count: pasteNodeCount }
  );

  const pasteParallelFromClipboard = intl.formatMessage(
    {
      defaultMessage: '{count, plural, one {Paste a parallel action} other {Paste {count} parallel actions}}',
      id: 'af1Dbe',
      description: 'Text for button to paste one or more parallel actions from clipboard',
    },
    { count: pasteNodeCount }
  );

  const a2aAgentLoopDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot add subsequent actions below agents in agent to agent workflows',
    id: 'HMJPEj',
    description: 'Message shown when action addition is disabled within agents in A2A workflows',
  });

  const a2aParallelBranchDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot add parallel branches on the root level in agent to agent workflows',
    id: 'ukGRNP',
    description: 'Message shown when parallel branch addition is disabled on root in A2A workflows',
  });

  const a2aPasteDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot paste actions below agents in agent to agent workflows',
    id: 'F3q0Hk',
    description: 'Message shown when paste is disabled below agents in A2A workflows',
  });

  const editHandoffText = intl.formatMessage({
    defaultMessage: 'Edit handoff',
    id: 'O4TSC3',
    description: 'Text for button to edit a handoff',
  });

  // const deleteRunAfterText = intl.formatMessage({
  //   defaultMessage: 'Delete run-after',
  //   id: 'GnVN11',
  //   description: 'Text for button to delete a run-after',
  // });

  const deleteHandoffText = intl.formatMessage({
    defaultMessage: 'Delete handoff',
    id: '9mjZIW',
    description: 'Text for button to delete a handoff',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    if (!graphId) {
      return;
    }
    const relationshipIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
    LoggerService().log({
      area: 'DropZone:openAddNodePanel',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new node.',
    });
  }, [dispatch, graphId, childId, parentId]);

  const showParallelBranchButton = !isLeaf && parentId;

  const [isPasteEnabled, setIsPasteEnabled] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      if (!open) {
        return;
      }
      setIsPasteEnabled(!(!copiedNode || isPasteDisabledForUpstreamAgent || isPasteDisabledForNonRootAgent));
    })();
  }, [open, copiedNode, isPasteDisabledForUpstreamAgent, isPasteDisabledForNonRootAgent]);

  const parentName = useNodeDisplayName(removeIdTag(parentId ?? ''));
  const childName = useNodeDisplayName(childId ?? '');

  const hasParentAndChild = useMemo(() => !!parentId && !!childId, [parentId, childId]);

  const automationId = useCallback(
    (buttonName: string) =>
      normalizeAutomationId(
        `msla-${buttonName}-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${
          replaceWhiteSpaceWithUnderscore(childName) || 'undefined'
        }`
      ),
    [parentName, childName]
  );

  const handlePasteClicked = useCallback(
    async (isParallelBranch: boolean) => {
      if (!graphId || !isPasteEnabled) {
        return;
      }
      const relationshipIds = { graphId, childId, parentId };
      const pasteSingleNode = async (node: any, overrideRelationshipIds?: typeof relationshipIds, overrideIsParallel?: boolean) => {
        const ids = overrideRelationshipIds ?? relationshipIds;
        const parallel = overrideIsParallel ?? isParallelBranch;
        if (node?.isScopeNode) {
          const result = await dispatch(
            pasteScopeOperation({
              relationshipIds: ids,
              nodeId: node.nodeId,
              serializedValue: node.serializedOperation,
              allConnectionData: node.allConnectionData,
              staticResults: node.staticResults,
              upstreamNodeIds: upstreamNodesOfChild,
              isParallelBranch: parallel,
            })
          );
          return (result as any).payload as string;
        }
        const result = await dispatch(
          pasteOperation({
            relationshipIds: ids,
            nodeId: node.nodeId,
            nodeData: node.nodeData,
            nodeTokenData: node.nodeTokenData,
            operationInfo: node.nodeOperationInfo,
            connectionData: node.nodeConnectionData,
            comment: node.nodeComment,
            isParallelBranch: parallel,
          })
        );
        return (result as any).payload as string;
      };

      if (copiedNode?.isMultiNode && Array.isArray(copiedNode.nodes)) {
        const edges: Array<{ source: string; target: string }> = copiedNode.edges ?? [];

        if (edges.length === 0) {
          // No internal edges — flat paste (original behavior)
          if (isParallelBranch) {
            let prevNodeId = await pasteSingleNode(copiedNode.nodes[0], undefined, true);
            for (let i = 1; i < copiedNode.nodes.length; i++) {
              prevNodeId = await pasteSingleNode(copiedNode.nodes[i], { graphId, childId: undefined, parentId: prevNodeId }, false);
            }
          } else {
            for (let i = copiedNode.nodes.length - 1; i >= 0; i--) {
              await pasteSingleNode(copiedNode.nodes[i]);
            }
          }
        } else {
          // Graph-aware paste: preserve branching structure from edges
          const nodeIds = copiedNode.nodes.map((n: any) => n.nodeId as string);
          const nodeMap = new Map<string, any>(copiedNode.nodes.map((n: any) => [n.nodeId, n]));

          // Build adjacency lists
          const incomingEdges = new Map<string, string[]>();
          const outgoingEdges = new Map<string, string[]>();
          for (const edge of edges) {
            if (!incomingEdges.has(edge.target)) {
              incomingEdges.set(edge.target, []);
            }
            incomingEdges.get(edge.target)!.push(edge.source);
            if (!outgoingEdges.has(edge.source)) {
              outgoingEdges.set(edge.source, []);
            }
            outgoingEdges.get(edge.source)!.push(edge.target);
          }

          // Find roots (no incoming internal edges) and leaves (no outgoing)
          const roots = nodeIds.filter((id: string) => !incomingEdges.has(id) || incomingEdges.get(id)!.length === 0);
          const leaves = nodeIds.filter((id: string) => !outgoingEdges.has(id) || outgoingEdges.get(id)!.length === 0);

          // Topological sort (Kahn's algorithm)
          const inDegree = new Map<string, number>();
          for (const id of nodeIds) {
            inDegree.set(id, 0);
          }
          for (const edge of edges) {
            inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
          }
          const queue = [...roots];
          const sorted: string[] = [];
          while (queue.length > 0) {
            const current = queue.shift()!;
            sorted.push(current);
            for (const target of outgoingEdges.get(current) ?? []) {
              inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
              if (inDegree.get(target) === 0) {
                queue.push(target);
              }
            }
          }

          // Paste nodes in topological order, preserving graph structure
          const pastedIdMap = new Map<string, string>();
          const predecessorUsed = new Set<string>();
          let firstRootPastedId: string | undefined;

          for (const clipNodeId of sorted) {
            const node = nodeMap.get(clipNodeId);
            const predecessors = incomingEdges.get(clipNodeId) ?? [];
            const isRoot = predecessors.length === 0;
            let pastedId: string;

            if (isRoot) {
              if (firstRootPastedId) {
                // Additional roots: parallel branch from the original parent
                pastedId = await pasteSingleNode(node, { graphId, childId: undefined, parentId }, true);
              } else {
                // First root: insert at the target position
                if (isParallelBranch) {
                  pastedId = await pasteSingleNode(node, undefined, true);
                } else {
                  pastedId = await pasteSingleNode(node);
                }
                firstRootPastedId = pastedId;
              }
            } else {
              const firstPred = predecessors[0];
              const pastedPredId = pastedIdMap.get(firstPred)!;

              if (predecessorUsed.has(firstPred)) {
                // Predecessor already has a chained successor — create parallel branch
                pastedId = await pasteSingleNode(node, { graphId, childId: undefined, parentId: pastedPredId }, true);
              } else {
                // First successor of this predecessor — chain after it
                pastedId = await pasteSingleNode(node, { graphId, childId: undefined, parentId: pastedPredId }, false);
                predecessorUsed.add(firstPred);
              }

              // Add edges for additional predecessors (convergence points)
              for (let p = 1; p < predecessors.length; p++) {
                const additionalPredId = pastedIdMap.get(predecessors[p]);
                if (additionalPredId) {
                  dispatch(addRunAfter({ childOperationId: pastedId, parentOperationId: additionalPredId }));
                }
              }
            }

            pastedIdMap.set(clipNodeId, pastedId);
          }

          // Fix leaf-to-child connections for sequential paste
          if (!isParallelBranch && childId && firstRootPastedId) {
            const firstRootIsLeaf = leaves.includes(roots[0]);
            if (!firstRootIsLeaf) {
              // First root was auto-connected to childId but it's not a leaf — remove that edge
              dispatch(removeRunAfter({ childOperationId: childId, parentOperationId: firstRootPastedId }));
              // Connect actual leaf nodes to childId
              for (const leaf of leaves) {
                const pastedLeafId = pastedIdMap.get(leaf);
                if (pastedLeafId) {
                  dispatch(addRunAfter({ childOperationId: childId, parentOperationId: pastedLeafId }));
                }
              }
            }
          }
        }
      } else {
        await pasteSingleNode(copiedNode);
      }

      LoggerService().log({
        area: 'EdgeContextualMenu:handlePasteClicked',
        level: LogEntryLevel.Verbose,
        message: `New ${isParallelBranch ? 'parallel' : ''} node added via paste.`,
      });
    },
    [graphId, childId, parentId, dispatch, isPasteEnabled, upstreamNodesOfChild, copiedNode]
  );

  const ref = useRef<HTMLDivElement>(null);

  const addActionMenuItem = (
    <MenuItem icon={<AddIcon />} onClick={openAddNodePanel} data-automation-id={automationId('add')} disabled={isAddActionDisabled}>
      {newActionText}
    </MenuItem>
  );

  const addParallelBranchMenuItem = (
    <MenuItem
      icon={<ParallelIcon />}
      onClick={addParallelBranch}
      data-automation-id={automationId('add-parallel')}
      disabled={isAddParallelBranchDisabled}
    >
      {newBranchText}
    </MenuItem>
  );

  const addAgentMenuItem = (
    <MenuItem icon={<AgentIcon />} onClick={addAgenticLoop} data-automation-id={automationId('add-agentic-loop')}>
      {isAddAgentHandoff ? newHandOffAgentText : newAgentText}
    </MenuItem>
  );

  const addParallelAgentMenuItem = (
    <MenuItem
      icon={<AgentIcon />}
      onClick={() => addAgenticLoop({ parallel: true })}
      data-automation-id={automationId('add-parallel-agentic-loop')}
    >
      {newHandOffAgentText}
    </MenuItem>
  );

  const editHandoffMenuItem = (
    <MenuItem icon={<EditIcon />} onClick={editHandoff} data-automation-id={automationId('edit-handoff')}>
      {editHandoffText}
    </MenuItem>
  );

  // const deleteRunAfterMenuItem = (
  //   <>
  //     <MenuDivider />
  //     <MenuItem icon={<DeleteIcon />} onClick={deleteRunAfter} data-automation-id={automationId('delete-run-after')}>
  //       {deleteRunAfterText}
  //     </MenuItem>
  //   </>
  // );

  const deleteHandoffMenuItem = (
    <>
      <MenuDivider />
      <MenuItem icon={<DeleteIcon />} onClick={deleteHandoff} data-automation-id={automationId('delete-handoff')}>
        {deleteHandoffText}
      </MenuItem>
    </>
  );

  const customMenuItemObjects = isUiInteractionsServiceEnabled()
    ? (UiInteractionsService()
        .getAddButtonMenuItems?.({ graphId, parentId, childId })
        ?.map((item) => <CustomMenu key={item.text} item={item} data-automation-id={automationId(`custom-menu-${item.text}`)} />) ?? [])
    : [];

  const customMenuItems =
    (customMenuItemObjects?.length ?? 0) > 0 ? [<MenuDivider key={'custom-items-divider'} />, ...customMenuItemObjects] : [];

  return (
    <>
      <div ref={ref} style={{ position: 'fixed', top: location?.y, left: location?.x }} />
      <Popover
        onOpenChange={(_, data) => setOpen(data.open)}
        trapFocus
        open={open}
        withArrow={true}
        positioning={{ target: ref.current, position: 'after' }}
      >
        <PopoverSurface style={{ padding: '4px' }}>
          <MenuList onClick={() => setOpen(false)}>
            {isHandoff ? (
              <>
                {editHandoffMenuItem}
                {addParallelAgentMenuItem}
                {hasParentAndChild && deleteHandoffMenuItem}
              </>
            ) : (
              <>
                {isAddActionDisabled ? (
                  <Tooltip content={a2aAgentLoopDisabledText} relationship="description">
                    {addActionMenuItem}
                  </Tooltip>
                ) : (
                  addActionMenuItem
                )}
                {showParallelBranchButton &&
                  (isAddParallelBranchDisabled ? (
                    <Tooltip content={a2aParallelBranchDisabledText} relationship="description">
                      {addParallelBranchMenuItem}
                    </Tooltip>
                  ) : (
                    addParallelBranchMenuItem
                  ))}
                {(isAgenticWorkflow || isA2AWorkflow) && (graphId === 'root' || enableNestedAgentLoops) && addAgentMenuItem}
                {isPasteEnabled &&
                  (isPasteDisabledForUpstreamAgent ? (
                    <Tooltip content={a2aPasteDisabledText} relationship="description">
                      <MenuItem icon={<ClipboardIcon />} disabled={true} data-automation-id={automationId('paste')}>
                        {pasteFromClipboard}
                      </MenuItem>
                    </Tooltip>
                  ) : (
                    <Menu positioning="after">
                      <MenuSplitGroup>
                        <MenuItem
                          icon={<ClipboardIcon />}
                          onClick={() => handlePasteClicked(false)}
                          data-automation-id={automationId('paste')}
                        >
                          {pasteFromClipboard}
                        </MenuItem>
                        <MenuTrigger>
                          <MenuItem disabled={isAddParallelBranchDisabled} onClick={(e) => e.stopPropagation()} />
                        </MenuTrigger>
                      </MenuSplitGroup>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem icon={<ParallelIcon />} disabled={isAddParallelBranchDisabled} onClick={() => handlePasteClicked(true)}>
                            {pasteParallelFromClipboard}
                          </MenuItem>
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  ))}
                {/* {hasParentAndChild && deleteRunAfterMenuItem} */}
                {customMenuItems}
              </>
            )}
          </MenuList>
        </PopoverSurface>
      </Popover>
    </>
  );
};
