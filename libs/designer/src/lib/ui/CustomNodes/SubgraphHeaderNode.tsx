/* eslint-disable @typescript-eslint/no-empty-function */
import { expandPanel, changePanelNode } from '../../core/state/panelSlice';
import { useNodeMetadata } from '../../core/state/selectors/actionMetadataSelector';
import { useReadOnly } from '../../core/state/selectors/designerOptionsSelector';
import { useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import type { RootState } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { SubgraphHeader } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

const SubgraphHeaderNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();
  const dispatch = useDispatch();

  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);

  const childEdges = useEdgesByParent(id);
  const metadata = useNodeMetadata(id);

  const subgraphClick = useCallback(
    (_id: string) => {
      if (isCollapsed) {
        dispatch(expandPanel());
      }
      dispatch(changePanelNode(_id));
    },
    [dispatch, isCollapsed]
  );

  return (
    <div>
      <div>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <SubgraphHeader
          parentId={metadata?.graphId.split('-')[0] ?? ''}
          subgraphType={metadata?.subgraphType}
          title={data?.label}
          readOnly={readOnly}
          onClick={subgraphClick}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {childEdges.length === 0 && !readOnly ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      ) : null}
    </div>
  );
};

SubgraphHeaderNode.displayName = 'SubgraphHeaderNode';

export default memo(SubgraphHeaderNode);
