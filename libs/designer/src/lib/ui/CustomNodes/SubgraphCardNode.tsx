/* eslint-disable @typescript-eslint/no-empty-function */
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { expandPanel, changePanelNode } from '../../core/state/panel/panelSlice';
import { useNodeMetadata } from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesBySource } from '../../core/state/selectors/workflowNodeSelector';
import type { RootState } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import { SubgraphCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubgraphCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const subgraphId = id.split('-#')[0];

  const readOnly = useReadOnly();
  const dispatch = useDispatch();

  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);

  const selected = useIsNodeSelected(subgraphId);
  const metadata = useNodeMetadata(id);
  const edges = useEdgesBySource(id);

  const isAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;

  const subgraphClick = useCallback(
    (_id: string) => {
      if (isCollapsed) {
        dispatch(expandPanel());
      }
      dispatch(changePanelNode(_id));
    },
    [dispatch, isCollapsed]
  );

  const isEmpty = edges.filter((edge) => !edge.target.endsWith('#footer')).length === 0;
  const showEmptyGraphComponents = isEmpty && !isAddCase;

  return (
    <div>
      <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          {metadata?.subgraphType ? (
            <SubgraphCard
              parentId={metadata?.graphId.split('-')[0] ?? ''}
              subgraphType={metadata.subgraphType}
              title={subgraphId}
              selected={selected}
              readOnly={readOnly}
              onClick={subgraphClick}
            />
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
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
