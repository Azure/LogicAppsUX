/* eslint-disable react/display-name */
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { AddButton } from './addButton';
import {
  containsIdTag,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
  LogEntryLevel,
  LoggerService,
  SUBGRAPH_TYPES,
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
import { useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { EdgePillButton, NodeAddButton, NodeLine } from '@microsoft/designer-ui-v2';
import { AddFilled } from '@fluentui/react-icons';
import { terminalConnectionLength, useConnectionStyles } from './connections.styles';
import { Tooltip } from '@fluentui/react-components';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
  isRevealed?: boolean;
  sharedPresentation?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = memo(
  ({ graphId, parentId, childId, isLeaf = false, tabIndex = 0, isRevealed, sharedPresentation }) => {
    const intl = useIntl();
    const dispatch = useDispatch<AppDispatch>();
    const isA2AWorkflow = useIsA2AWorkflow();
    const enabled = useSharedNodeUi();
    const shared = sharedPresentation ?? enabled;
    const readOnly = useReadOnly();
    const styles = useConnectionStyles();
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const terminal = isRevealed === undefined;
    const revealed = terminal || isRevealed || hovered || focused;

    const nodeMetadata = useNodeMetadata(removeIdTag(parentId ?? ''));
    const terminalVariant =
      nodeMetadata?.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_TRUE
        ? 'dashedSuccess'
        : nodeMetadata?.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_FALSE
          ? 'dashedDanger'
          : 'dashedNeutral';
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
      if (!copiedNode) {
        return;
      }
      const pasteSingleNode = async (node: any) => {
        if (node?.isScopeNode) {
          await dispatch(
            pasteScopeOperation({
              relationshipIds,
              nodeId: node.nodeId,
              serializedValue: node.serializedOperation,
              allConnectionData: node.allConnectionData,
              staticResults: node.staticResults,
              upstreamNodeIds: upstreamNodesOfChild,
            })
          );
        } else {
          await dispatch(
            pasteOperation({
              relationshipIds,
              nodeId: node.nodeId,
              nodeData: node.nodeData,
              nodeTokenData: node.nodeTokenData,
              operationInfo: node.nodeOperationInfo,
              connectionData: node.nodeConnectionData,
              comment: node.nodeComment,
            })
          );
        }
      };

      if (copiedNode?.isMultiNode && Array.isArray(copiedNode.nodes)) {
        // Paste in reverse so the inserted nodes keep their original top-to-bottom order
        // (each paste inserts between the same parent/child edge).
        for (let i = copiedNode.nodes.length - 1; i >= 0; i--) {
          await pasteSingleNode(copiedNode.nodes[i]);
        }
      } else {
        await pasteSingleNode(copiedNode);
      }

      LoggerService().log({
        area: 'DropZone:handlePasteClicked',
        level: LogEntryLevel.Verbose,
        message: 'New node added via paste.',
      });
    }, [graphId, childId, parentId, dispatch, upstreamNodesOfChild]);

    const hotkeyRef = useHotkeys(
      ['meta+v', 'ctrl+v'],
      async () => {
        if (preventDropItemInA2A || (shared && readOnly)) {
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

    const openMenu = useCallback(() => {
      if (shared && readOnly) {
        return;
      }
      const rect = buttonRef.current?.getBoundingClientRect();
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
    }, [dispatch, graphId, parentId, childId, isLeaf, shared, readOnly]);
    const actionButtonClick = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu();
      },
      [openMenu]
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
        {isDragging && !(shared && readOnly) ? (
          <DropTarget
            graphId={graphId}
            parentId={parentId}
            childId={childId}
            upstreamNodesOfChild={upstreamNodesOfChild}
            preventDropItemInA2A={preventDropItemInA2A}
            isWithinAgenticLoop={isWithinAgenticLoop}
          />
        ) : shared ? (
          <div className={styles.controlRow}>
            <div
              ref={buttonRef}
              className={styles.control}
              data-edge-control={terminal ? 'terminal' : 'insertion'}
              data-revealed={revealed}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setFocused(false);
                }
              }}
            >
              {terminal ? (
                <>
                  <NodeLine
                    className={styles.terminalLine}
                    variant={terminalVariant}
                    length={terminalConnectionLength}
                    orientation="vertical"
                  />
                  <Tooltip content={tooltipText} relationship="label">
                    <NodeAddButton
                      id={buttonId}
                      data-automation-id={automationId('plus')}
                      label={tooltipText}
                      tabIndex={tabIndex}
                      onClick={actionButtonClick}
                      onContextMenu={actionButtonClick}
                      disabled={readOnly}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation();
                        }
                      }}
                      onKeyUp={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation();
                        }
                      }}
                    />
                  </Tooltip>
                </>
              ) : (
                <EdgePillButton
                  id={buttonId}
                  data-automation-id={automationId('plus')}
                  icon={<AddFilled />}
                  tooltip={tooltipText}
                  ariaLabel={tooltipText}
                  tabIndex={tabIndex}
                  isRevealed={revealed}
                  onActivate={openMenu}
                  onContextMenu={actionButtonClick}
                  disabled={readOnly}
                />
              )}
            </div>
          </div>
        ) : (
          <div className={'msla-drop-zone-viewmanager'}>
            <div ref={buttonRef}>
              <AddButton
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
  }
);
