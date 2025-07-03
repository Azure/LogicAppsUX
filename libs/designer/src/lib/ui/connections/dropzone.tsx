/* eslint-disable react/display-name */
import { memo, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useDrop } from 'react-dnd';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { css } from '@fluentui/utilities';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import {
  containsIdTag,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';

import { useNodesTokenDependencies } from '../../core/state/operation/operationSelector';
import type { AppDispatch } from '../../core';
import { pasteOperation, pasteScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { useUpstreamNodes } from '../../core/state/tokens/tokenSelectors';
import {
  useAllGraphParents,
  useGetAllOperationNodesWithin,
  useHasUpstreamAgenticLoop,
  useIsWithinAgenticLoop,
  useNodeDisplayName,
  useNodeMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import { retrieveClipboardData } from '../../core/utils/clipboard';
import { setEdgeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import type { DropItem } from './helpers';
import { canDropItem } from './helpers';
import { useIsDraggingNode } from '../../core/hooks/useIsDraggingNode';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
}

export const DropZone: React.FC<DropZoneProps> = memo(({ graphId, parentId, childId, isLeaf = false, tabIndex = 0 }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useIsDarkMode();
  const isA2AWorkflow = useIsA2AWorkflow();

  const nodeMetadata = useNodeMetadata(removeIdTag(parentId ?? ''));
  // For subgraph nodes, we want to use the id of the scope node as the parentId to get the dependancies
  const newParentId = useMemo(() => {
    if (nodeMetadata?.subgraphType) {
      return nodeMetadata.parentNodeId;
    }
    return parentId;
  }, [nodeMetadata, parentId]);

  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? newParentId ?? ''), graphId, childId);
  const hasUpstreamAgenticLoop = useHasUpstreamAgenticLoop(Array.from(upstreamNodesOfChild));

  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);

  const preventDropItemInA2A = useMemo(() => {
    if (!isA2AWorkflow) {
      return false;
    }
    // If there's an upstream agentic loop
    if (hasUpstreamAgenticLoop) {
      // Allow drop only if we're within a different agentic loop (subgraph)
      return !isWithinAgenticLoop;
    }
    // No upstream agentic loop, allow drop
    return false;
  }, [hasUpstreamAgenticLoop, isA2AWorkflow, isWithinAgenticLoop]);

  const immediateAncestor = useGetAllOperationNodesWithin(parentId && !containsIdTag(parentId) ? parentId : '');
  const upstreamNodes = useMemo(() => new Set([...upstreamNodesOfChild, ...immediateAncestor]), [immediateAncestor, upstreamNodesOfChild]);
  const upstreamNodesDependencies = useNodesTokenDependencies(upstreamNodes);
  const upstreamScopeArr = useAllGraphParents(graphId);
  const upstreamScopes = useMemo(() => new Set(upstreamScopeArr), [upstreamScopeArr]);

  const handlePasteClicked = useCallback(async () => {
    const relationshipIds = { graphId, childId, parentId };
    const copiedNode = await retrieveClipboardData();
    if (copiedNode) {
      if (copiedNode?.isScopeNode) {
        dispatch(
          pasteScopeOperation({
            relationshipIds,
            nodeId: copiedNode.nodeId,
            serializedValue: copiedNode.serializedOperation,
            allConnectionData: copiedNode.allConnectionData,
            staticResults: copiedNode.staticResults,
            upstreamNodeIds: upstreamNodesOfChild,
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
          })
        );
      }
      LoggerService().log({
        area: 'DropZone:handlePasteClicked',
        level: LogEntryLevel.Verbose,
        message: 'New node added via paste.',
      });
    }
  }, [graphId, childId, parentId, dispatch, upstreamNodesOfChild]);

  const hotkeyRef = useHotkeys(
    ['meta+v', 'ctrl+v'],
    async () => {
      if (preventDropItemInA2A) {
        return;
      }
      const copiedNode = await retrieveClipboardData();
      const pasteEnabled = !!copiedNode;
      if (pasteEnabled) {
        handlePasteClicked();
      }
    },
    { preventDefault: true }
  );

  const isDragging = useIsDraggingNode();

  const [{ canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: DropItem) =>
        canDropItem(
          item,
          upstreamNodes,
          upstreamNodesDependencies,
          upstreamScopes,
          childId,
          parentId,
          preventDropItemInA2A,
          isWithinAgenticLoop
        ),
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
      }),
    }),
    [graphId, parentId, childId, upstreamNodes, upstreamNodesDependencies, preventDropItemInA2A, isWithinAgenticLoop]
  );

  const parentName = useNodeDisplayName(removeIdTag(parentId ?? ''));
  const childName = useNodeDisplayName(childId);
  const parentSubgraphName = useNodeDisplayName(parentId && containsIdTag(parentId) ? removeIdTag(parentId) : '');

  const tooltipText = childId
    ? intl.formatMessage(
        {
          defaultMessage: 'Insert a new step between {parentName} and {childName}',
          id: 'CypYLs',
          description: 'Tooltip for the button to add a new step (action or branch)',
        },
        {
          parentName,
          childName,
        }
      )
    : parentSubgraphName
      ? intl.formatMessage(
          {
            defaultMessage: 'Insert a new step in {parentSubgraphName}',
            id: 'RjvpD+',
            description: 'Tooltip for the button to add a new step under subgraph',
          },
          {
            parentSubgraphName,
          }
        )
      : intl.formatMessage(
          {
            defaultMessage: 'Insert a new step after {parentName}',
            id: '2r30S9',
            description: 'Tooltip for the button to add a new step (action or branch)',
          },
          {
            parentName,
          }
        );

  const actionButtonClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      e.preventDefault();
      dispatch(
        setEdgeContextMenuData({
          graphId,
          parentId,
          childId,
          isLeaf,
          location: {
            x: (rect?.left ?? 0) + (rect?.width ?? 0),
            y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
          },
        })
      );
    },
    [dispatch, graphId, parentId, childId, isLeaf]
  );

  const buttonId = normalizeAutomationId(
    `msla-edge-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${replaceWhiteSpaceWithUnderscore(childName) || 'undefined'}`
  );

  const automationId = useCallback(
    (buttonName: string) =>
      normalizeAutomationId(
        `msla-${buttonName}-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${
          replaceWhiteSpaceWithUnderscore(childName) || 'undefined'
        }`
      ),
    [parentName, childName]
  );

  const buttonRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={(node) => {
        drop(node);
        hotkeyRef.current = node;
      }}
      className={css('msla-drop-zone-viewmanager', isDragging && (canDrop ? 'canDrop' : 'cannotDrop'))}
    >
      {isDragging && (
        <div style={{ display: 'grid', placeItems: 'center' }}>
          {canDrop ? <AllowDropTarget fill="#0078D4" /> : <BlockDropTarget fill={isDarkMode ? '#252423' : '#edebe9'} />}
        </div>
      )}
      {!isDragging && (
        <div ref={buttonRef}>
          <ActionButtonV2
            id={buttonId}
            dataAutomationId={automationId('plus')}
            tabIndex={tabIndex}
            title={tooltipText}
            onClick={actionButtonClick}
          />
        </div>
      )}
    </div>
  );
});
