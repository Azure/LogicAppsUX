import type { AppDispatch } from '../../core';
import { useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import { ADD_CARD_TYPE, NoActionCard, AddActionCardV2 } from '@microsoft/designer-ui';
import { guid, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { PlaceholderTriggerCard } from '@microsoft/designer-ui-v2';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import { useIntl } from 'react-intl';

const PlaceholderNode = ({ id, data }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelectedInOperationPanel(id);
  const isReadOnly = useReadOnly();
  const sharedOption = useSharedNodeUi();
  const intl = useIntl();
  const presentation =
    (data?.presentation as NodePresentation | undefined) ?? getNodePresentation(WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE, sharedOption);
  const title = intl.formatMessage({
    defaultMessage: 'Add a trigger to start your workflow',
    id: 'VxhNgo',
    description: 'Empty workflow trigger placeholder',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    const relationshipIds = { graphId: 'root' };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds, addingTrigger: true }));
  }, [dispatch]);

  return (
    <div>
      <DefaultHandle type="target" />
      {presentation.shared ? (
        <PlaceholderTriggerCard
          title={title}
          selected={selected}
          role={isReadOnly ? undefined : 'button'}
          tabIndex={isReadOnly ? undefined : 0}
          aria-label={title}
          aria-disabled={isReadOnly || undefined}
          onClick={isReadOnly ? undefined : openAddNodePanel}
          onKeyDown={
            isReadOnly
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    openAddNodePanel();
                  }
                }
          }
        />
      ) : isReadOnly ? (
        <NoActionCard />
      ) : (
        <AddActionCardV2 addCardType={ADD_CARD_TYPE.TRIGGER} onClick={openAddNodePanel} selected={selected} />
      )}
      <DefaultHandle type="source" />
    </div>
  );
};

PlaceholderNode.displayName = 'PlaceholderNode';

export default memo(PlaceholderNode);
