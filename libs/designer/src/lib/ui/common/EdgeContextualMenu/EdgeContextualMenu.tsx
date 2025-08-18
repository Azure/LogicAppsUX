import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { batch, useDispatch } from 'react-redux';
import { Popover, PopoverSurface, MenuList, MenuItem, Tooltip, MenuDivider } from '@fluentui/react-components';
import {
  LogEntryLevel,
  LoggerService,
  UiInteractionsService,
  agentOperation,
  customLengthGuid,
  guid,
  isUiInteractionsServiceEnabled,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
} from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useOnViewportChange } from '@xyflow/react';

import { useIsAgenticWorkflow, useEdgeContextMenuData, useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
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
  const graphId = useMemo(() => menuData?.graphId, [menuData]);
  const parentId = useMemo(() => menuData?.parentId, [menuData]);
  const childId = useMemo(() => menuData?.childId, [menuData]);
  const isLeaf = useMemo(() => menuData?.isLeaf, [menuData]);
  const location = useMemo(() => menuData?.location, [menuData]);
  const isHandoff = useMemo(() => menuData?.isHandoff, [menuData]);

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
  const hasUpstreamAgenticLoop = useHasUpstreamAgenticLoop(upstreamNodesOfParent);

  const isAddAgentHandoff = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;
  const isAddActionDisabled = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;
  const isAddParallelBranchDisabled = isA2AWorkflow && graphId === 'root';
  const isPasteDisabled = isA2AWorkflow && graphId === 'root' && hasUpstreamAgenticLoop;

  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => setOpen(!!menuData), [menuData]);

  useOnViewportChange({
    onStart: useCallback(() => open && setOpen?.(false), [open, setOpen]),
  });

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
    defaultMessage: 'Add an agentic loop',
    id: 'Wq8rLF',
    description: 'Button text for adding an agentic loop',
  });

  const newHandOffAgentText = intl.formatMessage({
    defaultMessage: 'Add a hand-off agent',
    id: 'MbUEdr',
    description: 'Text for button to add an agentic loop',
  });

  const pasteFromClipboard = intl.formatMessage({
    defaultMessage: 'Paste an action',
    id: 'ZUCTVP',
    description: 'Text for button to paste an action from clipboard',
  });

  const pasteParallelFromClipboard = intl.formatMessage({
    defaultMessage: 'Paste a parallel action',
    id: 'wPjnM9',
    description: 'Text for button to paste a parallel action from clipboard',
  });

  const a2aAgentLoopDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot add subsequent actions below agentic loops in agent to agent workflows',
    id: 'KFFF+N',
    description: 'Message shown when action addition is disabled within agentic loops in A2A workflows',
  });

  const a2aParallelBranchDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot add parallel branches on the root level in agent to agent workflows',
    id: 'ukGRNP',
    description: 'Message shown when parallel branch addition is disabled on root in A2A workflows',
  });

  const a2aPasteDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot paste actions below agentic loops in agent to agent workflows',
    id: 'VPVCkv',
    description: 'Message shown when paste is disabled below agentic loops in A2A workflows',
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
      const copiedNode = await retrieveClipboardData();
      setIsPasteEnabled(!!copiedNode && !isPasteDisabled);
    })();
  }, [open, isPasteDisabled]);

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
      if (!graphId || isPasteDisabled) {
        return;
      }
      const relationshipIds = { graphId, childId, parentId };
      const copiedNode = await retrieveClipboardData();
      if (!copiedNode) {
        return;
      }
      if (copiedNode?.isScopeNode) {
        dispatch(
          pasteScopeOperation({
            relationshipIds,
            nodeId: copiedNode.nodeId,
            serializedValue: copiedNode.serializedOperation,
            allConnectionData: copiedNode.allConnectionData,
            staticResults: copiedNode.staticResults,
            upstreamNodeIds: upstreamNodesOfChild,
            isParallelBranch,
          })
        );
      } else {
        dispatch(
          pasteOperation({
            relationshipIds,
            nodeId: copiedNode.nodeId,
            nodeData: copiedNode.nodeData,
            nodeTokenData: copiedNode.nodeTokenData,
            operationInfo: copiedNode.nodeOperationInfo,
            connectionData: copiedNode.nodeConnectionData,
            comment: copiedNode.nodeComment,
            isParallelBranch,
          })
        );
      }
      LoggerService().log({
        area: 'EdgeContextualMenu:handlePasteClicked',
        level: LogEntryLevel.Verbose,
        message: `New ${isParallelBranch ? 'parallel' : ''} node added via paste.`,
      });
    },
    [graphId, childId, parentId, dispatch, upstreamNodesOfChild, isPasteDisabled]
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
                {(isAgenticWorkflow || isA2AWorkflow) && graphId === 'root' && addAgentMenuItem}
                {isPasteEnabled &&
                  (isPasteDisabled ? (
                    <Tooltip content={a2aPasteDisabledText} relationship="description">
                      <CustomMenu
                        item={{
                          icon: <ClipboardIcon />,
                          text: pasteFromClipboard,
                          onClick: () => handlePasteClicked(false),
                          dataAutomationId: automationId('paste'),
                          disabled: true,
                          subMenuItems: [
                            {
                              text: pasteFromClipboard,
                              ariaLabel: pasteFromClipboard,
                              onClick: () => handlePasteClicked(false),
                              disabled: true,
                            },
                            {
                              text: pasteParallelFromClipboard,
                              ariaLabel: pasteParallelFromClipboard,
                              onClick: () => handlePasteClicked(true),
                              disabled: true,
                            },
                          ],
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <CustomMenu
                      item={{
                        icon: <ClipboardIcon />,
                        text: pasteFromClipboard,
                        onClick: () => handlePasteClicked(false),
                        dataAutomationId: automationId('paste'),
                        subMenuItems: [
                          {
                            text: pasteFromClipboard,
                            ariaLabel: pasteFromClipboard,
                            onClick: () => handlePasteClicked(false),
                          },
                          {
                            text: pasteParallelFromClipboard,
                            ariaLabel: pasteParallelFromClipboard,
                            onClick: () => handlePasteClicked(true),
                          },
                        ],
                      }}
                    />
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
