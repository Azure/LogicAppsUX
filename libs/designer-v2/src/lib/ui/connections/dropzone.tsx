/* eslint-disable react/display-name */
import { memo, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import {
  containsIdTag,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';

import type { AppDispatch } from '../../core';
import { pasteOperation, pasteScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { useUpstreamNodes } from '../../core/state/tokens/tokenSelectors';
import {
  useHasUpstreamAgenticLoop,
  useIsWithinAgenticLoop,
  useNodeDisplayName,
  useNodeMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { retrieveClipboardData } from '../../core/utils/clipboard';
import { setEdgeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { useIsDraggingNode } from '../../core/hooks/useIsDraggingNode';
import { DropTarget } from './dropTarget';

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
    <div ref={(node) => (hotkeyRef.current = node)}>
      {isDragging ? (
        <DropTarget
          graphId={graphId}
          parentId={parentId}
          childId={childId}
          upstreamNodesOfChild={upstreamNodesOfChild}
          preventDropItemInA2A={preventDropItemInA2A}
          isWithinAgenticLoop={isWithinAgenticLoop}
        />
      ) : (
        <div className={'msla-drop-zone-viewmanager'}>
          <div ref={buttonRef}>
            <ActionButtonV2
              id={buttonId}
              dataAutomationId={automationId('plus')}
              tabIndex={tabIndex}
              title={tooltipText}
              onClick={actionButtonClick}
            />
          </div>
        </div>
      )}
    </div>
  );
});
