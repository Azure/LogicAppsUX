/* eslint-disable @typescript-eslint/no-empty-function */
import type { AppDispatch } from '../../core';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { AddActionCard, ADD_CARD_TYPE, NoActionCard } from '@microsoft/designer-ui';
import { guid } from '@microsoft/logic-apps-shared';
import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './handles/DefaultHandle';

const PlaceholderNode = ({ id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelectedInOperationPanel(id);
  const isReadOnly = useReadOnly();

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId: 'root' };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, addingTrigger: true }));
  }, [dispatch]);

  return (
    <div>
      <DefaultHandle type="target" />
      {isReadOnly ? <NoActionCard /> : <AddActionCard addCardType={ADD_CARD_TYPE.TRIGGER} onClick={openAddNodePanel} selected={selected} />}
      <DefaultHandle type="source" />
    </div>
  );
};

PlaceholderNode.displayName = 'PlaceholderNode';

export default memo(PlaceholderNode);
