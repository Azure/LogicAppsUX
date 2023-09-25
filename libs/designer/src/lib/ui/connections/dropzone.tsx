import type { AppDispatch, RootState } from '../../core';
import { pasteOperation } from '../../core/actions/bjsworkflow/copypaste';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { useUpstreamNodes } from '../../core/state/tokens/tokenSelectors';
import { useNodeDisplayName, useGetAllOperationNodesWithin } from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import AddBranchIcon from './edgeContextMenuSvgs/addBranchIcon.svg';
import AddNodeIcon from './edgeContextMenuSvgs/addNodeIcon.svg';
import { ActionButton, Callout, DirectionalHint, FocusZone } from '@fluentui/react';
import { css } from '@fluentui/utilities';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import { containsIdTag, guid, removeIdTag } from '@microsoft/utils-logic-apps';
import { useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useOnViewportChange } from 'reactflow';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ graphId, parentId, childId, isLeaf = false }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const [showCallout, setShowCallout] = useState(false);
  const copiedNode = useSelector((state: RootState) => state.clipboard.copiedNode);

  useOnViewportChange({
    onStart: useCallback(() => {
      if (showCallout) {
        setShowCallout(false);
      }
    }, [showCallout]),
  });

  const newActionText = intl.formatMessage({
    defaultMessage: 'Add an action',
    description: 'Text for button to add a new action',
  });

  const newBranchText = intl.formatMessage({
    defaultMessage: 'Add a parallel branch',
    description: 'Text for button to add a parallel branch',
  });

  const pasteFromClipboard = intl.formatMessage({
    defaultMessage: 'Paste an action',
    description: 'Text for button to paste an action from clipboard',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
  }, [dispatch, graphId, childId, parentId]);

  const handlePasteClicked = useCallback(() => {
    const relationshipIds = { graphId, childId, parentId };
    if (copiedNode) {
      dispatch(
        pasteOperation({
          nodeId: copiedNode.nodeId,
          operationInfo: copiedNode.operationInfo,
          nodeData: copiedNode.nodeData,
          relationshipIds,
        })
      );
    }
  }, [graphId, childId, parentId, dispatch, copiedNode]);

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, isParallelBranch: true }));
  }, [dispatch, graphId, parentId]);

  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? parentId ?? graphId));
  const immediateAncestor = useGetAllOperationNodesWithin(parentId && !containsIdTag(parentId) ? parentId : '');
  const upstreamNodes = new Set([...upstreamNodesOfChild, ...immediateAncestor]);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: { id: string; dependencies?: string[]; graphId?: string }) => {
        // This supports preventing moving a node with a dependency above its upstream node
        for (const dec of item.dependencies ?? []) {
          if (!upstreamNodes.has(dec)) {
            return false;
          }
        }
        // TODO: Support preventing moving a node below downstream output
        // TODO: Support calculating dependencies when dragging of scopes
        return item.id !== childId && item.id !== parentId;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [graphId, parentId, childId, upstreamNodes]
  );

  const parentName = useNodeDisplayName(parentId);
  const childName = useNodeDisplayName(childId);
  const parentSubgraphName = useNodeDisplayName(parentId && containsIdTag(parentId) ? removeIdTag(parentId) : '');

  const tooltipText = childId
    ? intl.formatMessage(
        {
          defaultMessage: 'Insert a new step between {parentName} and {childName}',
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
          description: 'Tooltip for the button to add a new step under subgraph',
        },
        {
          parentSubgraphName,
        }
      )
    : intl.formatMessage(
        {
          defaultMessage: 'Insert a new step after {parentName}',
          description: 'Tooltip for the button to add a new step (action or branch)',
        },
        {
          parentName,
        }
      );

  const actionButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowCallout(!showCallout);
  };

  const buttonId = `msla-edge-button-${parentId}-${childId}`.replace(/\W/g, '-');

  const showParallelBranchButton = !isLeaf && parentId;

  return (
    <div
      ref={drop}
      className={css('msla-drop-zone-viewmanager2', isOver && canDrop && 'canDrop', isOver && !canDrop && 'cannotDrop')}
      style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}
    >
      {isOver && (
        <div style={{ height: '24px', display: 'grid', placeItems: 'center' }}>
          {canDrop ? <AllowDropTarget fill="#0078D4" /> : <BlockDropTarget fill="#797775" />}
        </div>
      )}
      {!isOver && (
        <>
          <ActionButtonV2
            id={buttonId}
            title={tooltipText}
            onClick={actionButtonClick}
            dataAutomationId={`msla-plus-button-${parentId}-${childId}`.replace(/\W/g, '-')}
          />
          {showCallout && (
            <Callout
              role="dialog"
              gapSpace={0}
              target={`#${buttonId}`}
              onDismiss={() => setShowCallout(false)}
              onMouseLeave={() => setShowCallout(false)}
              directionalHint={DirectionalHint.bottomCenter}
              setInitialFocus
            >
              <FocusZone>
                <div className="msla-add-context-menu">
                  <ActionButton
                    iconProps={{ imageProps: { src: AddNodeIcon } }}
                    onClick={openAddNodePanel}
                    data-automation-id={`msla-add-action-${parentId}-${childId}`.replace(/\W/g, '-')}
                  >
                    {newActionText}
                  </ActionButton>
                  {showParallelBranchButton ? (
                    <ActionButton
                      iconProps={{ imageProps: { src: AddBranchIcon } }}
                      onClick={addParallelBranch}
                      data-automation-id={`msla-add-parallel-branch-${parentId}-${childId}`.replace(/\W/g, '-')}
                    >
                      {newBranchText}
                    </ActionButton>
                  ) : null}
                  {copiedNode ? (
                    <ActionButton iconProps={{ iconName: 'Paste' }} onClick={handlePasteClicked}>
                      {pasteFromClipboard}
                    </ActionButton>
                  ) : null}
                </div>
              </FocusZone>
            </Callout>
          )}
        </>
      )}
    </div>
  );
};
