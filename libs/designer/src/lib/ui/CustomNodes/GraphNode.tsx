/* eslint-disable @typescript-eslint/no-empty-function */
import { ProviderWrappedContext } from '../../core';
import type { WorkflowGraph } from '../../core/parsers/models/workflowNode';
import { changePanelNode, expandPanel } from '../../core/state/panelSlice';
import { useBrandColor, useIconUri, useActionMetadata, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useWorkflowNode } from '../../core/state/selectors/workflowNodeSelector';
import type { AppDispatch, RootState } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { ScopeCard } from '@microsoft/designer-ui';
import { memo, useCallback, useContext } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

const GraphNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const node = useActionMetadata(id);

  const { readOnly, isMonitoringView } = useContext(ProviderWrappedContext) ?? {};

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
  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);
  const graph = useWorkflowNode(id) as WorkflowGraph;
  const operationInfo = useOperationInfo(id);
  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);
  const dispatch = useDispatch<AppDispatch>();
  const nodeClick = useCallback(() => {
    if (isCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(id));
  }, [dispatch, id, isCollapsed]);

  if (!node) {
    return null;
  }

  const isEmptyGraph = !graph?.edges && (graph?.children[0] as any).children.length === 0;
  const normalizedType = node.type.toLowerCase();

  const validTypes = ['if', 'switch', 'foreach', 'scope'];
  if (validTypes.includes(normalizedType)) {
    return (
      <div className="msla-scope-v2 msla-scope-card">
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ transform: 'translate(-50%, 50%)', visibility: 'hidden' }}
        />
        <ScopeCard
          brandColor={brandColor}
          icon={iconUri}
          collapsed={false}
          drag={drag}
          draggable={!readOnly}
          dragPreview={dragPreview}
          isDragging={isDragging}
          id={id}
          isMonitoringView={isMonitoringView}
          title={data.label}
          readOnly={readOnly}
          onClick={nodeClick}
        />
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', transform: 'translate(-50%, -50%)' }}
        />
      </div>
    );
  } else {
    return renderGenericGraph(id, targetPosition, sourcePosition, isEmptyGraph, readOnly);
  }
};

function renderGenericGraph(
  nodeId: string,
  targetPosition: Position,
  sourcePosition: Position,
  isEmptyGraph: boolean,
  readOnly?: boolean
): JSX.Element {
  return (
    <div className="msla-actions-container">
      <div>
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ transform: 'translate(-50%, 50%)', visibility: 'hidden' }}
        />
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      {!readOnly && isEmptyGraph && (
        <div style={{ display: 'grid', placeItems: 'center', width: '200', height: '30', marginTop: '10px' }}>
          <DropZone graphId={nodeId} />
        </div>
      )}
    </div>
  );
}
GraphNode.displayName = 'GraphNode';

export default memo(GraphNode);
