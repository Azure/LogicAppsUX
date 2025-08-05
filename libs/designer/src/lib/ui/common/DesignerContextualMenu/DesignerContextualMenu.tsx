import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CardContextMenu } from '@microsoft/designer-ui';
import type { LogicAppsV2, TopLevelDropdownMenuItem } from '@microsoft/logic-apps-shared';
import {
  SUBGRAPH_TYPES,
  UiInteractionsService,
  WorkflowService,
  getRecordEntry,
  isScopeOperation,
  isUiInteractionsServiceEnabled,
} from '@microsoft/logic-apps-shared';

import { useNodeContextMenuData } from '../../../core/state/designerView/designerViewSelectors';
import { DeleteMenuItem, CopyMenuItem, ResubmitMenuItem, ExpandCollapseMenuItem, CollapseMenuItem } from '../../../ui/menuItems';
import { PinMenuItem } from '../../../ui/menuItems/pinMenuItem';
import { RunAfterMenuItem } from '../../../ui/menuItems/runAfterMenuItem';
import { useOperationInfo, type AppDispatch, type RootState } from '../../../core';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { useOperationAlternateSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import {
  changePanelNode,
  setSelectedPanelActiveTab,
  setAlternateSelectedNode,
  setSelectedNodeId,
} from '../../../core/state/panel/panelSlice';
import { RUN_AFTER_PANEL_TAB } from '../../../ui/CustomNodes/constants';
import { shouldDisplayRunAfter } from '../../../ui/CustomNodes/helpers';
import {
  useIsActionCollapsed,
  useIsAgentLoop,
  useNodeDisplayName,
  useNodeMetadata,
  useRunData,
  useRunInstance,
} from '../../../core/state/workflow/workflowSelectors';
import {
  useSuppressDefaultNodeSelectFunctionality,
  useNodeSelectAdditionalCallback,
} from '../../../core/state/designerOptions/designerOptionsSelectors';
import { copyOperation, copyScopeOperation } from '../../../core/actions/bjsworkflow/copypaste';
import { CopyTooltip } from './CopyTooltip';
import { CustomMenu } from '../EdgeContextualMenu/customMenu';
import { NodeMenuPriorities } from './Priorities';
import type { DropdownMenuCustomNode } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuCustomNode';
import { toggleCollapsedActionId } from '../../../core/state/workflow/workflowSlice';

export const DesignerContextualMenu = () => {
  const menuData = useNodeContextMenuData();
  const nodeId = useMemo(() => menuData?.nodeId ?? '', [menuData?.nodeId]);
  const isNodeCollapsed = useIsActionCollapsed(nodeId);

  const title = useNodeDisplayName(nodeId);

  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => setOpen(!!menuData?.location), [menuData?.location]);

  const dispatch = useDispatch<AppDispatch>();

  const rootState = useSelector((state: RootState) => state);
  const alternateSelectedNodeId = useOperationAlternateSelectedNodeId();

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
    dispatch(setSelectedPanelActiveTab(RUN_AFTER_PANEL_TAB));
  }, [dispatch, handleNodeSelection]);

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(nodeId));
  }, [dispatch, nodeId]);

  const pinClick = useCallback(() => {
    dispatch(
      setAlternateSelectedNode({
        nodeId: nodeId === alternateSelectedNodeId ? '' : nodeId,
        updatePanelOpenState: true,
        panelPersistence: 'pinned',
      })
    );
  }, [dispatch, nodeId, alternateSelectedNodeId]);

  const collapseClick = useCallback(() => {
    dispatch(toggleCollapsedActionId(nodeId));
  }, [nodeId, dispatch]);

  const operationFromWorkflow = getRecordEntry(rootState.workflow.operations, nodeId) as LogicAppsV2.OperationDefinition;
  const metadata = useNodeMetadata(nodeId);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);
  const operationInfo = useOperationInfo(nodeId);
  const isScopeNode = useMemo(() => isScopeOperation(operationInfo?.type), [operationInfo?.type]);
  const runAfter = shouldDisplayRunAfter(operationFromWorkflow, isTrigger);
  const isAgentOperation = useIsAgentLoop(nodeId);
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

  const actionContextMenuOptions: DropdownMenuCustomNode[] = useMemo(() => {
    isNodeCollapsed;

    const collapseActionOption = {
      priority: NodeMenuPriorities.Collapse,
      renderCustomComponent: () =>
        isTrigger || isAgentOperation ? null : <CollapseMenuItem key={'collapse'} nodeId={nodeId} onClick={collapseClick} />,
    };
    if (isNodeCollapsed) {
      return [collapseActionOption];
    }

    return [
      ...(isUiInteractionsServiceEnabled()
        ? transformMenuItems(UiInteractionsService().getNodeContextMenuItems?.({ graphId: metadata?.graphId, nodeId: nodeId }) ?? [])
        : []),
      {
        priority: NodeMenuPriorities.Delete,
        renderCustomComponent: () => (
          <DeleteMenuItem key={'delete'} isTrigger={isTrigger} operationType={operationInfo?.type} onClick={deleteClick} showKey />
        ),
      },
      {
        priority: NodeMenuPriorities.Copy,
        renderCustomComponent: () => <CopyMenuItem key={'copy'} isTrigger={isTrigger} isScope={isScopeNode} onClick={copyClick} showKey />,
      },
      { priority: NodeMenuPriorities.Pin, renderCustomComponent: () => <PinMenuItem key={'pin'} nodeId={nodeId} onClick={pinClick} /> },
      ...(runData?.canResubmit
        ? [
            {
              priority: NodeMenuPriorities.Resubmit,
              renderCustomComponent: () => <ResubmitMenuItem key={'resubmit'} onClick={resubmitClick} />,
            },
          ]
        : []),
      ...(runAfter
        ? [
            {
              priority: NodeMenuPriorities.RunAfter,
              renderCustomComponent: () => <RunAfterMenuItem key={'run after'} onClick={runAfterClick} />,
            },
          ]
        : []),
      collapseActionOption,
    ];
  }, [
    isNodeCollapsed,
    metadata?.graphId,
    nodeId,
    runData?.canResubmit,
    runAfter,
    isTrigger,
    isAgentOperation,
    collapseClick,
    operationInfo?.type,
    deleteClick,
    isScopeNode,
    copyClick,
    pinClick,
    resubmitClick,
    runAfterClick,
  ]);

  const actionContextMenuItems: JSX.Element[] = actionContextMenuOptions
    .sort((a, b) => (a?.priority ?? NodeMenuPriorities.Default) - (b?.priority ?? NodeMenuPriorities.Default))
    .map((option) => option.renderCustomComponent() as JSX.Element);

  const subgraphMenuItems: JSX.Element[] = useMemo(
    () => [
      ...(metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE || metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION
        ? [<DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />]
        : []),
    ],
    [deleteClick, metadata?.subgraphType]
  );

  const graphMenuItems: JSX.Element[] = useMemo(
    () => [<ExpandCollapseMenuItem key={'expand-collapse'} menuKey={'expand-collapse'} nodeId={nodeId} />],
    [nodeId]
  );

  const menuItems = useMemo(() => {
    const items: JSX.Element[] = [];
    if (metadata?.subgraphType === SUBGRAPH_TYPES.UNTIL_DO) {
      // Do-Until is a special case, we show normal action context menu items
      items.push(...actionContextMenuItems);
    } else {
      // For all other subgraph types, we show the subgraph context menu items
      items.push(...(metadata?.subgraphType ? subgraphMenuItems : actionContextMenuItems));
    }

    if (metadata?.subgraphType || isScopeNode) {
      // For subgraphs and scope nodes, we show graph context menu items
      items.push(...graphMenuItems);
    }

    return items;
  }, [metadata?.subgraphType, isScopeNode, actionContextMenuItems, subgraphMenuItems, graphMenuItems]);

  return (
    <>
      <CardContextMenu
        contextMenuLocation={menuData?.location}
        menuItems={menuItems}
        open={open}
        title={title}
        setOpen={(o) => setOpen(o)}
      />
      {showCopyCallout ? <CopyTooltip id={nodeId} location={menuData?.location} hideTooltip={clearCopyCallout} /> : null}
    </>
  );
};
