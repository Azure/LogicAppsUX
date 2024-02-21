import type { AppDispatch } from '../../core';
import { pasteOperation } from '../../core/actions/bjsworkflow/copypaste';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { useUpstreamNodes } from '../../core/state/tokens/tokenSelectors';
import { useNodeDisplayName, useGetAllOperationNodesWithin } from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import { MenuDivider, MenuItem, MenuList, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import {
  bundleIcon,
  ArrowBetweenDown24Filled,
  ArrowBetweenDown24Regular,
  ArrowSplit24Filled,
  ArrowSplit24Regular,
  ClipboardPasteFilled,
  ClipboardPasteRegular,
} from '@fluentui/react-icons';
// import AddBranchIcon from './edgeContextMenuSvgs/addBranchIcon.svg';
// import AddNodeIcon from './edgeContextMenuSvgs/addNodeIcon.svg';
import { css } from '@fluentui/utilities';
import { ActionButtonV2, convertUIElementNameToAutomationId } from '@microsoft/designer-ui';
import { containsIdTag, guid, normalizeAutomationId, removeIdTag } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useOnViewportChange } from 'reactflow';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
}

const AddIcon = bundleIcon(ArrowBetweenDown24Filled, ArrowBetweenDown24Regular);
const ParallelIcon = bundleIcon(ArrowSplit24Filled, ArrowSplit24Regular);
const ClipboardIcon = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);

export const DropZone: React.FC<DropZoneProps> = ({ graphId, parentId, childId, isLeaf = false }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const [showCallout, setShowCallout] = useState(false);
  const localStorageClipboard = window.localStorage.getItem('msla-clipboard');
  const copiedNode = localStorageClipboard ? JSON.parse(localStorageClipboard) : null;

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
    setShowCallout(false);
  }, [dispatch, graphId, childId, parentId]);

  const handlePasteClicked = useCallback(() => {
    const relationshipIds = { graphId, childId, parentId };
    if (copiedNode) {
      dispatch(
        pasteOperation({
          relationshipIds,
          nodeId: copiedNode.nodeId,
          nodeData: copiedNode.nodeData,
          operationInfo: copiedNode.operationInfo,
          connectionData: copiedNode.connectionData,
        })
      );
    }
    setShowCallout(false);
  }, [graphId, childId, parentId, dispatch, copiedNode]);

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, isParallelBranch: true }));
    setShowCallout(false);
  }, [dispatch, graphId, parentId]);

  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? parentId ?? graphId));
  const immediateAncestor = useGetAllOperationNodesWithin(parentId && !containsIdTag(parentId) ? parentId : '');
  const upstreamNodes = useMemo(() => new Set([...upstreamNodesOfChild, ...immediateAncestor]), [immediateAncestor, upstreamNodesOfChild]);

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
        canDrop: monitor.isOver() && monitor.canDrop(), // Only calculate canDrop when isOver is true
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

  const actionButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowCallout(!showCallout);
    },
    [showCallout]
  );

  const buttonId = normalizeAutomationId(
    `msla-edge-button-${convertUIElementNameToAutomationId(parentName)}-${convertUIElementNameToAutomationId(childName) || 'undefined'}`
  );

  const showParallelBranchButton = !isLeaf && parentId;

  const automationId = useCallback(
    (buttonName: string) =>
      normalizeAutomationId(
        `msla-${buttonName}-button-${convertUIElementNameToAutomationId(parentName)}-${
          convertUIElementNameToAutomationId(childName) || 'undefined'
        }`
      ),
    [parentName, childName]
  );

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
        <Popover
          open={showCallout}
          positioning={'after'}
          closeOnScroll={true}
          withArrow
          mouseLeaveDelay={500}
          onOpenChange={(e, { open }) => setShowCallout(open)}
        >
          <PopoverTrigger disableButtonEnhancement>
            <div tabIndex={-1}>
              <ActionButtonV2
                tabIndex={1}
                id={buttonId}
                title={tooltipText}
                dataAutomationId={automationId('plus')}
                onClick={actionButtonClick}
              />
            </div>
          </PopoverTrigger>
          <PopoverSurface style={{ padding: '4px' }}>
            <MenuList>
              <MenuItem icon={<AddIcon />} onClick={openAddNodePanel} data-automation-id={automationId('add')}>
                {newActionText}
              </MenuItem>
              {showParallelBranchButton && (
                <MenuItem icon={<ParallelIcon />} onClick={addParallelBranch} data-automation-id={automationId('add-parallel')}>
                  {newBranchText}
                </MenuItem>
              )}
              {copiedNode && (
                <>
                  <MenuDivider />
                  <MenuItem icon={<ClipboardIcon />} onClick={handlePasteClicked}>
                    {pasteFromClipboard}
                  </MenuItem>
                </>
              )}
            </MenuList>
          </PopoverSurface>
        </Popover>
      )}
    </div>
  );
};
