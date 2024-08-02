import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOnViewportChange } from '@xyflow/react';
import { CardContextMenu } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { SUBGRAPH_TYPES, WorkflowService, getRecordEntry } from '@microsoft/logic-apps-shared';

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
import { copyOperation } from '../../../core/actions/bjsworkflow/copypaste';
import constants from '../../../common/constants';

export const DesignerContextualMenu = () => {
  const menuData = useNodeContextMenuData();
  const nodeId = menuData?.nodeId ?? '';

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
  const isScopeNode = operationInfo?.type.toLowerCase() === constants.NODE.TYPE.SCOPE;
  const runAfter = shouldDisplayRunAfter(operationFromWorkflow, isTrigger);

  const resubmitClick = useCallback(() => {
    WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [nodeId]);
  }, [runInstance, nodeId]);

  const [showCopyCallout, setShowCopyCallout] = useState(false);

  useOnViewportChange({
    onStart: useCallback(() => {
      if (showCopyCallout) {
        setShowCopyCallout(false);
      }
    }, [showCopyCallout]),
  });

  const copyClick = useCallback(() => {
    setShowCopyCallout(true);
    dispatch(copyOperation({ nodeId }));
    setTimeout(() => {
      setShowCopyCallout(false);
    }, 3000);
  }, [dispatch, nodeId]);

  const title = useNodeDisplayName(nodeId);

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
    <CardContextMenu contextMenuLocation={menuData?.location} menuItems={menuItems} open={open} title={title} setOpen={(o) => setOpen(o)} />
  );
};
