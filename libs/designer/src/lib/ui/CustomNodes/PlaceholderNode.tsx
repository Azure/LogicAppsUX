/* eslint-disable @typescript-eslint/no-empty-function */
import type { AppDispatch } from '../../core';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { AddActionCard, ADD_CARD_TYPE, NoActionCard } from '@microsoft/designer-ui';
import { guid } from '@microsoft/logic-apps-shared';
import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const PlaceholderNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelected(id);
  const isReadOnly = useReadOnly();

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId: 'root' };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, addingTrigger: true }));
  }, [dispatch]);

  return (
    <div>
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      {isReadOnly ? <NoActionCard /> : <AddActionCard addCardType={ADD_CARD_TYPE.TRIGGER} onClick={openAddNodePanel} selected={selected} />}
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

PlaceholderNode.displayName = 'PlaceholderNode';

export default memo(PlaceholderNode);
