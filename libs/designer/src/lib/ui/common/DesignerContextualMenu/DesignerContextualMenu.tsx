import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CardContextMenu } from '@microsoft/designer-ui';
import type { LogicAppsV2, TopLevelDropdownMenuItem } from '@microsoft/logic-apps-shared';
import { SUBGRAPH_TYPES, UiInteractionsService, WorkflowService, getRecordEntry, isScopeOperation } from '@microsoft/logic-apps-shared';

import { useNodeContextMenuData } from '../../../core/state/designerView/designerViewSelectors';
import { DeleteMenuItem, CopyMenuItem, ResubmitMenuItem } from '../../../ui/menuItems';
import { PinMenuItem } from '../../../ui/menuItems/pinMenuItem';
import { RunAfterMenuItem } from '../../../ui/menuItems/runAfterMenuItem';
import { useOperationInfo, type AppDispatch, type RootState } from '../../../core';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { changePanelNode, selectPanelTab, setSelectedNodeId } from '../../../core/state/panel/panelSlice';
import { useOperationPanelPinnedNodeId } from '../../../core/state/panelV2/panelSelectors';
import { setPinnedNode } from '../../../core/state/panelV2/panelSlice';
import { RUN_AFTER_PANEL_TAB } from '../../../ui/CustomNodes/constants';
import { shouldDisplayRunAfter } from '../../../ui/CustomNodes/helpers';
import { useNodeDisplayName, useNodeMetadata, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import {
  useSuppressDefaultNodeSelectFunctionality,
  useNodeSelectAdditionalCallback,
} from '../../../core/state/designerOptions/designerOptionsSelectors';
import { copyOperation, copyScopeOperation } from '../../../core/actions/bjsworkflow/copypaste';
import { CopyTooltip } from './CopyTooltip';
import { CustomMenu } from '../../connections/customMenu';
import { Priorities } from '../../CustomNodes/Priorities';
import type { DropdownMenuCustomNode } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuCustomNode';

export const DesignerContextualMenu = () => {
  const menuData = useNodeContextMenuData();
  const nodeId = useMemo(() => menuData?.nodeId ?? '', [menuData?.nodeId]);
  const title = useNodeDisplayName(nodeId);

  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => setOpen(!!menuData?.location), [menuData?.location]);

  const dispatch = useDispatch<AppDispatch>();

  const rootState = useSelector((state: RootState) => state);
  const pinnedNodeId = useOperationPanelPinnedNodeId();

  const runInstance = useRunInstance();
  const runData = useRunData(nodeId);

  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelectFunctionality();
  const nodeSelectCallbackOverride = useNodeSelectAdditionalCallback();

  const handleNodeSelection = useCallback(() => {
    if (nodeSelectCallbackOverride) {
      nodeSelectCallbackOverride(nodeId);
    }
    if (suppressDefaultNodeSelect) {
      dispatch(setSelectedNodeId(nodeId));
    } else {
      dispatch(changePanelNode(nodeId));
    }
  }, [dispatch, nodeId, nodeSelectCallbackOverride, suppressDefaultNodeSelect]);

  const runAfterClick = useCallback(() => {
    handleNodeSelection();
    dispatch(selectPanelTab(RUN_AFTER_PANEL_TAB));
  }, [dispatch, handleNodeSelection]);

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(nodeId));
  }, [dispatch, nodeId]);

  const pinClick = useCallback(() => {
    dispatch(
      setPinnedNode({
        nodeId: nodeId === pinnedNodeId ? '' : nodeId,
        updatePanelOpenState: true,
      })
    );
  }, [dispatch, nodeId, pinnedNodeId]);

  const operationFromWorkflow = getRecordEntry(rootState.workflow.operations, nodeId) as LogicAppsV2.OperationDefinition;
  const metadata = useNodeMetadata(nodeId);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);
  const operationInfo = useOperationInfo(nodeId);
  const isScopeNode = useMemo(() => isScopeOperation(operationInfo?.type), [operationInfo?.type]);
  const runAfter = shouldDisplayRunAfter(operationFromWorkflow, isTrigger);

  const resubmitClick = useCallback(() => {
    WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [nodeId]);
  }, [runInstance, nodeId]);

  const [showCopyCallout, setShowCopyCallout] = useState(false);
  const copyClick = useCallback(() => {
    setShowCopyCallout(true);
    dispatch((isScopeNode ? copyScopeOperation : copyOperation)?.({ nodeId }));
    setCopyCalloutTimeout(setTimeout(() => setShowCopyCallout(false), 3000));
  }, [dispatch, nodeId, isScopeNode]);

  const [copyCalloutTimeout, setCopyCalloutTimeout] = useState<NodeJS.Timeout>();
  const clearCopyCallout = useCallback(() => {
    copyCalloutTimeout && clearTimeout(copyCalloutTimeout);
    setShowCopyCallout(false);
  }, [copyCalloutTimeout]);

  const transformMenuItems = (items: TopLevelDropdownMenuItem[]): DropdownMenuCustomNode[] => {
    return items.map((item) => ({
      priority: item?.priority,
      renderCustomComponent: () => <CustomMenu item={item} />,
    }));
  };

  const actionContextMenuOptions: DropdownMenuCustomNode[] = useMemo(
    () => [
      ...transformMenuItems(UiInteractionsService()?.getNodeContextMenuItems?.({ graphId: metadata?.graphId, nodeId: nodeId }) ?? []),
      { priority: Priorities.Delete, renderCustomComponent: () => <DeleteMenuItem key={'delete'} onClick={deleteClick} showKey /> },
      {
        priority: Priorities.Copy,
        renderCustomComponent: () => <CopyMenuItem key={'copy'} isTrigger={isTrigger} isScope={isScopeNode} onClick={copyClick} showKey />,
      },
      { priority: Priorities.Pin, renderCustomComponent: () => <PinMenuItem key={'pin'} nodeId={nodeId} onClick={pinClick} /> },
      ...(runData?.canResubmit
        ? [{ priority: Priorities.Resubmit, renderCustomComponent: () => <ResubmitMenuItem key={'resubmit'} onClick={resubmitClick} /> }]
        : []),
      ...(runAfter
        ? [{ priority: Priorities.RunAfter, renderCustomComponent: () => <RunAfterMenuItem key={'run after'} onClick={runAfterClick} /> }]
        : []),
    ],
    [
      metadata?.graphId,
      nodeId,
      runData?.canResubmit,
      runAfter,
      deleteClick,
      isTrigger,
      isScopeNode,
      copyClick,
      pinClick,
      resubmitClick,
      runAfterClick,
    ]
  );

  const actionContextMenuItems: JSX.Element[] = actionContextMenuOptions
    .sort((a, b) => (a?.priority ?? Priorities.Default) - (b?.priority ?? Priorities.Default))
    .map((option) => option.renderCustomComponent() as JSX.Element);

  const subgraphMenuItems: JSX.Element[] = useMemo(
    () => [
      ...(metadata?.subgraphType === SUBGRAPH_TYPES['SWITCH_CASE']
        ? [<DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />]
        : []),
    ],
    [deleteClick, metadata?.subgraphType]
  );

  const menuItems = useMemo(() => {
    // Do-Until is a special case, we show normal action context menu items
    if (metadata?.subgraphType === SUBGRAPH_TYPES.UNTIL_DO) {
      return actionContextMenuItems;
    }
    // For all other subgraph types, we show the subgraph context menu items
    return metadata?.subgraphType ? subgraphMenuItems : actionContextMenuItems;
  }, [metadata, subgraphMenuItems, actionContextMenuItems]);

  return (
    <>
      <CardContextMenu
        contextMenuLocation={menuData?.location}
        menuItems={menuItems}
        open={open}
        title={title}
        setOpen={(o) => setOpen(o)}
      />
      {showCopyCallout ? <CopyTooltip location={menuData?.location} hideTooltip={clearCopyCallout} /> : null}
    </>
  );
};
