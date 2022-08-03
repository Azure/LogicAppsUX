/* eslint-disable @typescript-eslint/no-empty-function */
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import { useIsGraphCollapsed, useIsLeafNode, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { DropZone } from '../connections/dropzone';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import { SubgraphCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubgraphCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const subgraphId = id.split('-#')[0];

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch();

  const selected = useIsNodeSelected(subgraphId);
  const metadata = useNodeMetadata(subgraphId);
  const isLeaf = useIsLeafNode(id);

  const isAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;

  const subgraphClick = useCallback((_id: string) => dispatch(changePanelNode(_id)), [dispatch]);

  const graphCollapsed = useIsGraphCollapsed(subgraphId);
  const handleGraphCollapse = useCallback(() => {
    dispatch(toggleCollapsedGraphId(subgraphId));
  }, [dispatch, subgraphId]);

  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isAddCase;

  const actionCount = metadata?.actionCount ?? 0;
  const collapsedText = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

  return (
    <div>
      <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          {metadata?.subgraphType ? (
            <SubgraphCard
              id={subgraphId}
              parentId={metadata?.graphId}
              subgraphType={metadata.subgraphType}
              selected={selected}
              readOnly={readOnly}
              onClick={subgraphClick}
              collapsed={graphCollapsed}
              handleCollapse={handleGraphCollapse}
            />
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
      {graphCollapsed ? <p className="no-actions-text">{collapsedText}</p> : null}
      {showEmptyGraphComponents ? (
        !readOnly ? (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={subgraphId} parent={metadata?.graphId ?? ''} />
          </div>
        ) : (
          <p className="no-actions-text">No Actions</p>
        )
      ) : null}
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
