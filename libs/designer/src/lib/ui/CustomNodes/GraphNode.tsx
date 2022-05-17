/* eslint-disable @typescript-eslint/no-empty-function */
import type { WorkflowGraph } from '../../core/parsers/models/workflowNode';
import { useBrandColor, useIconUri, useActionMetadata, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useWorkflowNode } from '../../core/state/selectors/workflowNodeSelector';
import { DropZone } from '../connections/dropzone';
import { ScopeCard } from '@microsoft/designer-ui';
import { memo } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';

const GraphNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const node = useActionMetadata(id);
  const [, drag, dragPreview] = useDrag(() => ({
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
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const graph = useWorkflowNode(id) as WorkflowGraph;
  const operationInfo = useOperationInfo(id);
  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);

  if (!node) {
    return null;
  }

  const isEmptyGraph = !graph?.edges && (graph?.children[0] as any).children.length === 0;
  const normalizedType = node.type.toLowerCase();

  if (normalizedType === 'scope' || normalizedType === 'foreach') {
    return (
      <div className="msla-scope-v2 msla-scope-card">
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ transform: 'translate(0, 50%)', visibility: 'hidden' }}
        />
        <ScopeCard
          brandColor={brandColor}
          icon={iconUri}
          collapsed={false}
          drag={drag}
          draggable={true}
          dragPreview={dragPreview}
          id={id}
          title={data.label}
        />
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', transform: 'translate(0, -50%)' }}
        />
      </div>
    );
  } else {
    return renderGenericGraph(id, targetPosition, sourcePosition, isEmptyGraph);
  }
};

function renderGenericGraph(nodeId: string, targetPosition: Position, sourcePosition: Position, isEmptyGraph: boolean): JSX.Element {
  return (
    <div className="msla-actions-container">
      <div>
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ transform: 'translate(0, 50%)', visibility: 'hidden' }}
        />
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', transform: 'translate(0, -50%)' }}
        />
      </div>
      {isEmptyGraph && (
        <div style={{ display: 'grid', placeItems: 'center', width: '200', height: '30', marginTop: '10px' }}>
          <DropZone graphId={nodeId} />
        </div>
      )}
    </div>
  );
}
GraphNode.displayName = 'GraphNode';

export default memo(GraphNode);
