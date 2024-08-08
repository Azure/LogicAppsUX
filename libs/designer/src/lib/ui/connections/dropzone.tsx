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
  useNodeDisplayName,
  useNodeMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import { retrieveClipboardData } from '../../core/utils/clipboard';
import { setEdgeContextMenuData } from '../../core/state/designerView/designerViewSlice';

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

  const nodeMetadata = useNodeMetadata(removeIdTag(parentId ?? ''));
  // For subgraph nodes, we want to use the id of the scope node as the parentId to get the dependancies
  const newParentId = useMemo(() => {
    if (nodeMetadata?.subgraphType) {
      return nodeMetadata.parentNodeId;
    }
    return parentId;
  }, [nodeMetadata, parentId]);
  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? newParentId ?? graphId));
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
            operationInfo: copiedNode.nodeOperationInfo,
            connectionData: copiedNode.nodeConnectionData,
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
      const copiedNode = await retrieveClipboardData();
      const pasteEnabled = !!copiedNode;
      if (pasteEnabled) {
        handlePasteClicked();
      }
    },
    { preventDefault: true }
  );

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: {
        id: string;
        dependencies?: string[];
        graphId?: string;
        isScope?: boolean;
      }) => {
        // This supports preventing moving a node with a dependency above its upstream node
        for (const dec of item.dependencies ?? []) {
          if (!upstreamNodes.has(dec)) {
            return false;
          }
        }
        if (item.isScope) {
          const scopeNodeId = removeIdTag(item.id);
          if (upstreamScopes.has(scopeNodeId)) {
            return false;
          }
        }

        for (const node of upstreamNodes) {
          if (
            upstreamNodesDependencies[node].has(item.id) ||
            (upstreamNodesDependencies[item.id] && upstreamNodesDependencies[item.id].has(node))
          ) {
            return false;
          }
        }
        // TODO: Support preventing moving a node below downstream output
        // TODO: Support calculating dependencies when dragging of scopes
        return item.id !== childId && item.id !== parentId;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.isOver() && monitor.canDrop(), // Only calculate canDrop when isOver is true
      }),
    }),
    [graphId, parentId, childId, upstreamNodes, upstreamNodesDependencies]
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
      className={css('msla-drop-zone-viewmanager2', isOver && canDrop && 'canDrop', isOver && !canDrop && 'cannotDrop')}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {isOver && (
        <div style={{ height: '24px', display: 'grid', placeItems: 'center' }}>
          {canDrop ? <AllowDropTarget fill="#0078D4" /> : <BlockDropTarget fill="#797775" />}
        </div>
      )}
      {!isOver && (
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
