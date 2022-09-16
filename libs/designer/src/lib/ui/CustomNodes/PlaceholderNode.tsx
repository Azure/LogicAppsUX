/* eslint-disable @typescript-eslint/no-empty-function */
import type { AppDispatch } from '../../core';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { guid } from '@microsoft-logic-apps/utils';
import { AddActionCard, ADD_CARD_TYPE } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

const PlaceholderNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelected(id);

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId: 'root' };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
  }, [dispatch]);

  return (
    <div>
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <AddActionCard addCardType={ADD_CARD_TYPE.TRIGGER} onClick={openAddNodePanel} selected={selected} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

PlaceholderNode.displayName = 'PlaceholderNode';

export default memo(PlaceholderNode);
