import type { RootState } from '../../core';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { useAllGraphParents } from '../../core/state/workflow/workflowSelectors';
import { getTriggerNode } from '../../core/utils/graph';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import AddBranchIcon from './edgeContextMenuSvgs/addBranchIcon.svg';
import AddNodeIcon from './edgeContextMenuSvgs/addNodeIcon.svg';
import { ActionButton, Callout, DirectionalHint } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import { guid, WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ graphId, parentId, childId }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const isAddingTrigger = useSelector((state: RootState) => {
    const triggerNode = getTriggerNode(state.workflow);
    return triggerNode.type === WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE;
  });
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

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: any) => {
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

  const tooltipText = intl.formatMessage({
    defaultMessage: 'Insert a new step',
    description: 'Tooltip for the button to add a new step (action or branch)',
  });

  const actionButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    toggleIsCalloutVisible();
  };

  const buttonId = `msla-edge-button-${parentId}-${childId}`.replace(/[^a-zA-Z-_ ]/g, '');

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
      {!isOver && !isAddingTrigger && (
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
            >
              <div className="msla-add-context-menu">
                <ActionButton iconProps={{ imageProps: { src: AddNodeIcon } }} onClick={openAddNodePanel}>
                  {newActionText}
                </ActionButton>
                {parentId ? (
                  <ActionButton iconProps={{ imageProps: { src: AddBranchIcon } }} onClick={addParallelBranch}>
                    {newBranchText}
                  </ActionButton>
                ) : null}
              </div>
            </Callout>
          )}
        </>
      )}
    </div>
  );
};
