import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { useAllGraphParents, useGetAllAncestors, useNodeGraphId } from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import AddBranchIcon from './edgeContextMenuSvgs/addBranchIcon.svg';
import AddNodeIcon from './edgeContextMenuSvgs/addNodeIcon.svg';
import { ActionButton, Callout, DirectionalHint, FocusZone } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ graphId, parentId, childId, isLeaf = false }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [showCallout, { toggle: toggleIsCalloutVisible }] = useBoolean(false);

  const newActionText = intl.formatMessage({
    defaultMessage: 'Add an action',
    description: 'Text for button to add a new action',
  });

  const newBranchText = intl.formatMessage({
    defaultMessage: 'Add a parallel branch',
    description: 'Text for button to add a parallel branch',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
  }, [dispatch, graphId, childId, parentId]);

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, isParallelBranch: true }));
  }, [dispatch, graphId, parentId]);

  const graphParents = useAllGraphParents(graphId);
  const allAncestors = useGetAllAncestors(childId ?? '');
  const parentGID = useNodeGraphId(parentId ?? '');
  const childGID = useNodeGraphId(childId ?? '');
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: { id: string; dependencies?: string[]; graphId?: string }) => {
        if (item.graphId !== parentGID && item.graphId !== childGID) {
          return false;
        }
        for (const dec of item.dependencies ?? []) {
          if (!allAncestors.has(dec)) {
            return false;
          }
        }
        if (graphParents.includes(item.id)) return false;
        return item.id !== childId && item.id !== parentId;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [graphId, parentId, childId]
  );

  const tooltipText = childId
    ? intl.formatMessage(
        {
          defaultMessage: 'Insert a new step between {parent} and {child}',
          description: 'Tooltip for the button to add a new step (action or branch)',
        },
        {
          parent: parentId,
          child: childId,
        }
      )
    : intl.formatMessage(
        {
          defaultMessage: 'Insert a new step after {parent}',
          description: 'Tooltip for the button to add a new step (action or branch)',
        },
        {
          parent: parentId,
        }
      );

  const actionButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    toggleIsCalloutVisible();
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
          <ActionButtonV2 id={buttonId} title={tooltipText} onClick={actionButtonClick} />
          {showCallout && (
            <Callout
              role="dialog"
              gapSpace={0}
              target={`#${buttonId}`}
              onDismiss={toggleIsCalloutVisible}
              onMouseLeave={toggleIsCalloutVisible}
              directionalHint={DirectionalHint.bottomCenter}
              setInitialFocus
            >
              <FocusZone>
                <div className="msla-add-context-menu">
                  <ActionButton iconProps={{ imageProps: { src: AddNodeIcon } }} onClick={openAddNodePanel}>
                    {newActionText}
                  </ActionButton>
                  {showParallelBranchButton ? (
                    <ActionButton iconProps={{ imageProps: { src: AddBranchIcon } }} onClick={addParallelBranch}>
                      {newBranchText}
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
