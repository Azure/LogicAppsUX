import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CardContextMenu } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { SUBGRAPH_TYPES, WorkflowService, getRecordEntry, isScopeOperation } from '@microsoft/logic-apps-shared';

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

  const actionContextMenuItems: JSX.Element[] = useMemo(
    () => [
      <DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />,
      <CopyMenuItem key={'copy'} isTrigger={isTrigger} isScope={isScopeNode} onClick={copyClick} showKey />,
      <PinMenuItem key={'pin'} nodeId={nodeId} onClick={pinClick} />,
      ...(runData?.canResubmit ? [<ResubmitMenuItem key={'resubmit'} onClick={resubmitClick} />] : []),
      ...(runAfter ? [<RunAfterMenuItem key={'run after'} onClick={runAfterClick} />] : []),
    ],
    [deleteClick, isTrigger, isScopeNode, copyClick, nodeId, pinClick, runData?.canResubmit, resubmitClick, runAfter, runAfterClick]
  );

  const subgraphMenuItems: JSX.Element[] = useMemo(
    () => [
      ...(metadata?.subgraphType === SUBGRAPH_TYPES['SWITCH_CASE']
        ? [<DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />]
        : []),
    ],
    [deleteClick, metadata?.subgraphType]
  );

  const menuItems = useMemo(
    () => (metadata?.subgraphType ? subgraphMenuItems : actionContextMenuItems),
    [metadata?.subgraphType, subgraphMenuItems, actionContextMenuItems]
  );

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
