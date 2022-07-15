/* eslint-disable @typescript-eslint/no-empty-function */
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { expandPanel, changePanelNode } from '../../core/state/panel/panelSlice';
import {
  useBrandColor,
  useIconUri,
  useIsConnectionRequired,
  useNodeConnectionName,
  useNodeDescription,
  useNodeMetadata,
  useOperationInfo,
} from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesBySource } from '../../core/state/workflow/workflowSelectors';
import type { RootState } from '../../core/store';
import { isLeafNodeFromEdges } from '../../core/utils/graph';
import { DropZone } from '../connections/dropzone';
import { labelCase } from '@microsoft-logic-apps/utils';
import { Card } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
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
      type: 'BOX',
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

  const selected = useIsNodeSelected(id);
  const edges = useEdgesBySource(id);
  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const nodeComment = useNodeDescription(id);
  const connectionName = useNodeConnectionName(id);
  const isConnectionRequired = useIsConnectionRequired(operationInfo);

  const showLeafComponents = !readOnly && isLeafNodeFromEdges(edges);

  const nodeClick = useCallback(() => {
    if (isCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(id));
  }, [dispatch, id, isCollapsed]);

  const brandColorResult = useBrandColor(operationInfo);
  const iconUriResult = useIconUri(operationInfo);

  const brandColor = brandColorResult.result;
  const comment = nodeComment
    ? {
        brandColor,
        comment: nodeComment,
        isDismissed: false,
        isEditing: false,
      }
    : undefined;

  const label = labelCase(data.label);
  return (
    <>
      <div>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <Card
          title={label}
          icon={iconUriResult.result}
          draggable={!readOnly}
          brandColor={brandColor}
          id={id}
          connectionRequired={isConnectionRequired}
          connectionDisplayName={connectionName}
          commentBox={comment}
          drag={drag}
          dragPreview={dragPreview}
          isDragging={isDragging}
          isMonitoringView={isMonitoringView}
          readOnly={readOnly}
          onClick={nodeClick}
          selected={selected}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      ) : null}
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
