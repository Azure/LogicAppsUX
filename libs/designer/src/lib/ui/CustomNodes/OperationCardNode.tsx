/* eslint-disable @typescript-eslint/no-empty-function */
import { expandPanel, changePanelNode } from '../../core/state/panelSlice';
import {
  useBrandColor,
  useIconUri,
  useNodeConnectionName,
  useNodeDescription,
  useNodeMetadata,
  useOperationInfo,
} from '../../core/state/selectors/actionMetadataSelector';
import { useMonitoringView, useReadOnly } from '../../core/state/selectors/designerOptionsSelector';
import { useEdgesByChild, useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import type { RootState } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { labelCase } from '@microsoft-logic-apps/utils';
import { Card, SubgraphHeader } from '@microsoft/designer-ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const dispatch = useDispatch();

  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);
  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      // "type" is required. It is used by the "accept" specification of drop targets.
      type: 'BOX',
      // The collect function utilizes a "monitor" instance (see the Overview for what this is)
      // to pull important pieces of state from the DnD system.
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{ parent: string; child: string }>();
        if (item && dropResult) {
          alert(`You dropped ${id} between ${dropResult.parent} and  ${dropResult.child}!`);
        }
      },
      item: {
        id: id,
      },
      canDrag: !readOnly,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly]
  );

  const childEdges = useEdgesByParent(id);
  const parentEdges = useEdgesByChild(id);
  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const nodeComment = useNodeDescription(id);
  const connectionName = useNodeConnectionName(id);

  const [isFirstChild, setIsFirstChild] = useState(false);
  useEffect(() => {
    setIsFirstChild(metadata?.graphId !== 'root' && !parentEdges.length);
  }, [metadata, parentEdges, setIsFirstChild]);

  const nodeClick = useCallback(() => {
    if (isCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(id));
  }, [dispatch, id, isCollapsed]);

  const subgraphClick = useCallback(
    (_id: string) => {
      if (isCollapsed) {
        dispatch(expandPanel());
      }
      dispatch(changePanelNode(_id));
    },
    [dispatch, isCollapsed]
  );

  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);
  if (metadata?.isPlaceholderNode) {
    if (readOnly || !isFirstChild) return null;
    return (
      <>
        <div style={{ visibility: 'hidden', height: '32px' }} />
        <div style={{ display: 'grid', placeItems: 'center', width: 200, height: 30, marginTop: '5px' }}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      </>
    );
  }

  const comment = nodeComment
    ? {
        brandColor: brandColor,
        comment: nodeComment,
        isDismissed: false,
        isEditing: false,
      }
    : undefined;

  const label = labelCase(data.label);
  return (
    <div>
      {isFirstChild ? <div style={{ visibility: 'hidden', height: '32px' }} /> : null}
      {isFirstChild && !readOnly && !metadata?.subgraphType ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      ) : null}
      <div>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        {metadata?.subgraphType ? (
          <SubgraphHeader
            parentId={metadata?.graphId.split('-')[0] ?? ''}
            subgraphType={metadata?.subgraphType}
            title={label}
            readOnly={readOnly}
            onClick={subgraphClick}
          />
        ) : (
          <Card
            title={label}
            icon={iconUri}
            draggable={!readOnly}
            brandColor={brandColor}
            id={id}
            connectionRequired={false}
            connectionDisplayName={connectionName}
            commentBox={comment}
            drag={drag}
            dragPreview={dragPreview}
            isDragging={isDragging}
            isMonitoringView={isMonitoringView}
            readOnly={readOnly}
            onClick={nodeClick}
          />
        )}
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

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
