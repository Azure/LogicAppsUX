import { css } from '@fluentui/utilities';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { useDispatch } from 'react-redux';
import { ActionButtonV2 } from '@microsoft/designer-ui';
import { guid } from '@microsoft-logic-apps/utils';
import { addNode } from '../../core/state/workflowSlice';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';

export interface DropZoneProps {
  parent: string;
  child?: string;
}
export const DropZone: React.FC<DropZoneProps> = ({ parent, child }) => {
  const dispatch = useDispatch();
  const onEdgeEndClick = (evt: any, parent: string, child?: string) => {
    evt.stopPropagation();
    const newId = guid();
    dispatch(
      addNode({
        id: newId,
        parentId: parent,
        childId: child,
      })
    );
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    // The type (or types) to accept - strings or symbols
    accept: 'BOX',
    drop: () => ({ child: child, parent: parent }),
    canDrop: (item) => {
      return (item as any).id !== child;
    },
    // Props to collect
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));
  return (
    <div
      ref={drop}
      className={css('msla-drop-zone-viewmanager2', isOver && canDrop && 'canDrop', isOver && !canDrop && 'cannotDrop')}
      style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}
    >
      {isOver && canDrop && (
        <div style={{ height: '24px', display: 'grid', placeItems: 'center' }}>
          <AllowDropTarget fill="#0078D4" />
        </div>
      )}
      {isOver && !canDrop && (
        <div style={{ height: '24px', display: 'grid', placeItems: 'center' }}>
          <BlockDropTarget fill="#797775" />
        </div>
      )}
      {!isOver && <ActionButtonV2 title={'Text'} onClick={(e) => onEdgeEndClick(e, parent, child)} />}
    </div>
  );
};
