import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import AddBranchIcon from './edgeContextMenuSvgs/addBranchIcon.svg';
import AddNodeIcon from './edgeContextMenuSvgs/addNodeIcon.svg';
import { ActionButton, Callout, DirectionalHint } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { guid } from '@microsoft-logic-apps/utils';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export interface DropZoneProps {
  graphId: string;
  parentId?: string;
  childId?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ graphId, parentId, childId }) => {
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
    const discoveryIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, discoveryIds }));
  }, [dispatch, graphId, childId, parentId]);

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    const discoveryIds = { graphId, childId: undefined, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, discoveryIds }));
  }, [dispatch, graphId, parentId]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    // The type (or types) to accept - strings or symbols
    accept: 'BOX',
    drop: () => ({ child: childId, parent: parentId }), // danielle check this, graph id
    canDrop: (item) => (item as any).id !== childId,
    // Props to collect
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const tooltipText = intl.formatMessage({
    defaultMessage: 'Insert a new step',
    description: 'Tooltip for the button to add a new step (action or branch)',
  });

  const actionButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    toggleIsCalloutVisible();
  };

  const buttonId = `msla-edge-button-${parentId?.replace('#', '')}-${childId?.replace('#', '')}`;

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
            >
              <div className="msla-add-context-menu">
                <ActionButton iconProps={{ imageProps: { src: AddNodeIcon } }} onClick={openAddNodePanel}>
                  {newActionText}
                </ActionButton>
                {childId ? (
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
