import type { AppDispatch } from '../../core';
import { pasteOperation, pasteScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { useUpstreamNodes } from '../../core/state/tokens/tokenSelectors';
import {
  useAllGraphParents,
  useGetAllOperationNodesWithin,
  useNodeDisplayName,
  useNodeMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import { MenuDivider, MenuItem, MenuList, Popover, PopoverSurface, PopoverTrigger, Tooltip } from '@fluentui/react-components';
import {
  ArrowBetweenDown24Filled,
  ArrowBetweenDown24Regular,
  ArrowSplit24Filled,
  ArrowSplit24Regular,
  ClipboardPasteFilled,
  ClipboardPasteRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { css } from '@fluentui/utilities';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import {
  containsIdTag,
  guid,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';
import { useNodesTokenDependencies } from '../../core/state/operation/operationSelector';
import { useCallback, useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useOnViewportChange } from '@xyflow/react';

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
  const [showNoPasteCallout, setShowNoPasteCallout] = useState(false);
  const [rootRef, setRef] = useState<HTMLDivElement | null>(null);
  const [isPasteEnabled, setIsPasteEnabled] = useState(false);

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
  useOnViewportChange({
    onStart: useCallback(() => {
      if (showCallout) {
        setShowCallout(false);
      } else if (showNoPasteCallout) {
        setShowNoPasteCallout(false);
      }
    }, [showCallout, showNoPasteCallout]),
  });

  const newActionText = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: 'mCzkXX',
    description: 'Text for button to add a new action',
  });

  const newBranchText = intl.formatMessage({
    defaultMessage: 'Add a parallel branch',
    id: 'LZm3ze',
    description: 'Text for button to add a parallel branch',
  });

  const pasteFromClipboard = intl.formatMessage({
    defaultMessage: 'Paste an action',
    id: 'ZUCTVP',
    description: 'Text for button to paste an action from clipboard',
  });

  const noPasteText = intl.formatMessage({
    defaultMessage: 'No action to paste',
    id: 'MmldTM',
    description: 'Text for tooltip when there is no action to paste',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
    setShowCallout(false);
    LoggerService().log({
      area: 'DropZone:openAddNodePanel',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new node.',
    });
  }, [dispatch, graphId, childId, parentId]);

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
    } else {
      setShowNoPasteCallout(true);
      setTimeout(() => {
        setShowNoPasteCallout(false);
      }, 3000);
    }
    setShowCallout(false);
  }, [graphId, childId, parentId, dispatch, upstreamNodesOfChild]);

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(
      expandDiscoveryPanel({
        nodeId: newId,
        relationshipIds,
        isParallelBranch: true,
      })
    );
    LoggerService().log({
      area: 'DropZone:addParallelBranch',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new parallel branch node.',
    });
    setShowCallout(false);
  }, [dispatch, graphId, parentId]);

  const ref = useHotkeys(
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

  const parentName = useNodeDisplayName(parentId);
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
      e.preventDefault();
      const copiedNode = await retrieveClipboardData();
      setIsPasteEnabled(!!copiedNode);
      setShowCallout(!showCallout);
    },
    [showCallout]
  );

  const buttonId = normalizeAutomationId(
    `msla-edge-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${replaceWhiteSpaceWithUnderscore(childName) || 'undefined'}`
  );

  const showParallelBranchButton = !isLeaf && parentId;

  const automationId = useCallback(
    (buttonName: string) =>
      normalizeAutomationId(
        `msla-${buttonName}-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${
          replaceWhiteSpaceWithUnderscore(childName) || 'undefined'
        }`
      ),
    [parentName, childName]
  );

  return (
    <div ref={ref as any}>
      <div
        ref={drop}
        className={css('msla-drop-zone-viewmanager2', isOver && canDrop && 'canDrop', isOver && !canDrop && 'cannotDrop')}
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <div ref={setRef}>
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
                  {isPasteEnabled && (
                    <>
                      <MenuDivider />
                      <MenuItem icon={<ClipboardIcon />} onClick={handlePasteClicked} data-automation-id={automationId('paste')}>
                        {pasteFromClipboard}
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </PopoverSurface>
            </Popover>
          )}
        </div>
        <Tooltip
          positioning={{ target: rootRef, position: 'below', align: 'end' }}
          withArrow
          content={noPasteText}
          relationship="description"
          visible={showNoPasteCallout}
        />
      </div>
    </div>
  );
};

async function retrieveClipboardData() {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      const clipboardData = await navigator.clipboard.readText();
      if (clipboardData) {
        const parsedData = JSON.parse(clipboardData);
        if (parsedData.mslaNode) {
          return parsedData;
        }
      }
      return null;
    }
    return JSON.parse(localStorage.getItem('msla-clipboard') ?? '');
  } catch (error) {
    return null;
  }
}
